import type { EyeStyle, FoodKind, Mood, SaveData, Stats, Vec } from './types';
import { STAGES, stageForXp, type StageDef } from './evolution';
import { DEFAULT_STATS, FOODS, applyFood, clamp, decay, moodFromStats, offlineDecay } from './logic';
import { mapSize } from './sprites';

export interface Food {
  id: number;
  kind: FoodKind;
  x: number;
  y: number;
  born: number;
}

export interface World {
  /** performance.now() ms */
  now: number;
  foods: Food[];
  cursor: Vec | null;
  cursorMovedAt: number;
  bounds: { w: number; h: number };
}

export type PetEvent =
  | { type: 'log'; text: string; cls: string }
  | { type: 'bubble'; text: string; ms?: number }
  | { type: 'ate'; food: Food; overfed: boolean }
  | { type: 'evolve-start'; to: number }
  | { type: 'evolved'; from: number; to: number }
  | { type: 'poked' }
  | { type: 'slept' }
  | { type: 'woke' };

const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)] as T;
const dist = (a: Vec, b: Vec): number => Math.hypot(a.x - b.x, a.y - b.y);

const LINES = {
  poke: ['hey!', '✻ boop', 'that tickles', 'hi :)', "I'm working here…", 'again?', '!', 'poke received'],
  wake: ['…huh? oh, hi', '*stretches*', 'was I sleeping?', 'resuming session…'],
  sleep: ['zzz…', 'going idle…', '*yawn* nap time'],
  idle: ['✻ Thinking…', 'reading files…', 'any tokens around?', 'running tests…', '*hums*', 'compacting context…', 'ls -la', 'Update Todos', 'searching for bugs…', 'git status'],
  hungry: ['so hungry…', 'need tokens', 'context window empty', 'feed me ▮'],
  tired: ['*yawn*', 'need coffee ☕', 'low energy…', 'so… sleepy'],
  sad: ['…', 'nobody pokes me', '*sigh*', 'is anyone there?'],
  overfed: ['too full…', 'rate limited', 'context overflow'],
  evolve: ['✻ Compacting context…', 'something is happening…'],
} as const;

export class Pet {
  x = 0;
  y = 0;
  facing: 1 | -1 = 1;
  name: string;
  stats: Stats;
  stage: number;
  fed: Record<FoodKind, number>;
  pokes: number;

  mood: Mood = 'idle';
  private moodUntil = 0;

  /** animation clock, seconds */
  t = 0;
  walkPhase = 0;
  moving = false;
  squish = 0;
  jump = 0;
  private jumpV = 0;
  private blinkUntil = 0;
  private nextBlink = 0;

  eatTimer = 0;
  private eating: Food | null = null;
  evolveTimer = 0;
  private evolveTo = -1;

  target: Vec | null = null;
  private wanderAt = 0;
  lastInteraction = 0;
  caffeineUntil = 0;
  private chatterAt = 0;

  events: PetEvent[] = [];

  constructor(save: SaveData | null, now: number) {
    this.name = save?.name ?? 'claude';
    this.stats = save ? offlineDecay(save.stats, Date.now() - save.savedAt) : { ...DEFAULT_STATS };
    this.stage = save ? clamp(save.stage, 0, STAGES.length - 1) : 0;
    this.fed = save?.fed ?? { token: 0, coffee: 0, bug: 0, commit: 0 };
    this.pokes = save?.pokes ?? 0;
    this.lastInteraction = now;
    this.chatterAt = now + 6000;
    this.wanderAt = now + 5000;
    this.nextBlink = now + 1500;
    this.mood = moodFromStats(this.stats);
  }

  get def(): StageDef {
    return STAGES[this.stage] ?? STAGES[0]!;
  }

  /** Sprite size on canvas in px. */
  get size(): { w: number; h: number } {
    const { cols, rows } = mapSize(this.def.sprite);
    return { w: cols * this.def.pixel, h: rows * this.def.pixel };
  }

  get head(): Vec {
    return { x: this.x, y: this.y - this.size.h + this.jump };
  }

  get center(): Vec {
    return { x: this.x, y: this.y - this.size.h / 2 + this.jump };
  }

  get sleeping(): boolean {
    return this.mood === 'sleeping';
  }

  get caffeinated(): boolean {
    return this.caffeineUntil > performance.now();
  }

  hitTest(p: Vec, pad = 8): boolean {
    const { w, h } = this.size;
    return p.x >= this.x - w / 2 - pad && p.x <= this.x + w / 2 + pad && p.y >= this.y - h - pad && p.y <= this.y + pad;
  }

  eyeStyle(now: number): EyeStyle {
    if (this.evolveTimer > 0) return 'open';
    if (this.sleeping) return 'closed';
    if (now < this.blinkUntil) return 'closed';
    if (this.mood === 'happy' || this.mood === 'excited') return 'happy';
    if (this.mood === 'sad') return 'sad';
    return 'open';
  }

  /** Which way the eyes look, in sprite pixels (−1/0/1). */
  look(cursor: Vec | null): Vec {
    if (!cursor || this.sleeping) return { x: 0, y: 0 };
    const c = this.center;
    const dx = cursor.x - c.x;
    const dy = cursor.y - c.y;
    return { x: Math.abs(dx) < 24 ? 0 : Math.sign(dx), y: Math.abs(dy) < 30 ? 0 : Math.sign(dy) };
  }

  private emit(e: PetEvent): void {
    this.events.push(e);
  }

  private say(text: string, ms?: number): void {
    this.emit({ type: 'bubble', text, ms });
  }

  private setMood(m: Mood, ms: number, now: number): void {
    this.mood = m;
    this.moodUntil = now + ms;
  }

  // ── interactions ───────────────────────────────────────────────

  poke(now: number): void {
    this.lastInteraction = now;
    this.pokes++;
    if (this.sleeping) {
      this.wake(now, 'poked');
      return;
    }
    if (this.evolveTimer > 0) return;
    this.squish = 1;
    if (this.jump === 0) this.jumpV = -240;
    this.stats = { ...this.stats, happiness: clamp(this.stats.happiness + 3) };
    if (this.eatTimer <= 0) this.setMood('happy', 1600, now);
    this.emit({ type: 'poked' });
    this.say(pick(LINES.poke), 1400);
  }

  setTarget(p: Vec, now: number): void {
    this.lastInteraction = now;
    if (this.sleeping) return;
    this.target = { ...p };
  }

  sleep(_now: number): void {
    if (this.sleeping) return;
    this.mood = 'sleeping';
    this.moodUntil = 0;
    this.target = null;
    this.moving = false;
    this.emit({ type: 'slept' });
    this.say(pick(LINES.sleep), 1800);
  }

  wake(now: number, reason: 'poked' | 'rested' | 'command'): void {
    if (!this.sleeping) return;
    this.mood = moodFromStats(this.stats);
    this.moodUntil = 0;
    this.lastInteraction = now;
    this.chatterAt = now + 8000;
    this.emit({ type: 'woke' });
    this.say(reason === 'rested' ? 'fully rested ✓' : pick(LINES.wake), 1800);
  }

  rename(name: string): void {
    this.name = name;
  }

  // ── simulation ─────────────────────────────────────────────────

  update(dt: number, w: World): void {
    const now = w.now;
    this.t += dt;
    this.stats = decay(this.stats, dt, this.sleeping);

    if (now >= this.nextBlink) {
      this.blinkUntil = now + 130;
      this.nextBlink = now + 2500 + Math.random() * 4000;
    }
    this.squish = Math.max(0, this.squish - dt * 5);
    if (this.jump < 0 || this.jumpV !== 0) {
      this.jumpV += 1500 * dt;
      this.jump += this.jumpV * dt;
      if (this.jump >= 0) {
        this.jump = 0;
        this.jumpV = 0;
      }
    }

    if (this.evolveTimer > 0) {
      this.moving = false;
      this.evolveTimer -= dt;
      if (this.evolveTimer <= 0) this.finishEvolve(now);
      return;
    }
    if (this.eatTimer > 0) {
      this.moving = false;
      this.eatTimer -= dt;
      if (this.eatTimer <= 0) this.finishEat(now);
      return;
    }
    if (this.sleeping) {
      this.moving = false;
      if (this.stats.energy >= 96) this.wake(now, 'rested');
      return;
    }

    if (this.moodUntil && now > this.moodUntil) this.moodUntil = 0;
    if (!this.moodUntil) this.mood = moodFromStats(this.stats);

    // ── pick a destination ──
    let dest: Vec | null = null;
    let stop = 6;
    const me: Vec = { x: this.x, y: this.y };
    // moveToward converges onto `stop` exactly, so arrival checks need a little slack
    const ARRIVE = 1.5;

    const food = this.nearestFood(w.foods);
    if (food) {
      dest = food;
      stop = 10;
      if (dist(me, food) <= stop + ARRIVE) {
        this.startEat(food, w, now);
        return;
      }
    } else if (this.target) {
      if (dist(me, this.target) <= stop + ARRIVE) this.target = null;
      else dest = this.target;
    } else if (w.cursor && now - w.cursorMovedAt < 2500) {
      const d = dist(me, w.cursor);
      if (d > 96) {
        dest = w.cursor;
        stop = 84;
      }
    }

    if (!dest && !this.target) this.idleBehaviour(now, w);

    if (dest) this.moveToward(dest, stop, dt);
    else this.moving = false;

    this.clampToBounds(w.bounds);
    this.chatter(now);
  }

  private nearestFood(foods: Food[]): Food | null {
    let best: Food | null = null;
    let bd = Infinity;
    for (const f of foods) {
      const d = dist(this, f);
      if (d < bd) {
        bd = d;
        best = f;
      }
    }
    return best;
  }

  private moveToward(dest: Vec, stop: number, dt: number): void {
    const dx = dest.x - this.x;
    const dy = dest.y - this.y;
    const d = Math.hypot(dx, dy);
    if (d <= stop) {
      this.moving = false;
      return;
    }
    let speed = this.def.speed;
    if (this.caffeinated) speed *= 1.7;
    if (this.stats.energy < 20) speed *= 0.55;
    if (this.stats.hunger < 15) speed *= 0.75;
    const step = Math.min(speed * dt, d - stop);
    this.x += (dx / d) * step;
    this.y += (dy / d) * step;
    if (Math.abs(dx) > 2) this.facing = dx > 0 ? 1 : -1;
    this.moving = true;
    this.walkPhase += dt * (this.caffeinated ? 16 : 10);
  }

  private clampToBounds(b: { w: number; h: number }): void {
    const { w, h } = this.size;
    this.x = clamp(this.x, w / 2 + 4, Math.max(w / 2 + 4, b.w - w / 2 - 4));
    this.y = clamp(this.y, h + 40, Math.max(h + 40, b.h - 12));
  }

  private idleBehaviour(now: number, w: World): void {
    if (this.stats.energy < 6) {
      this.sleep(now);
      return;
    }
    if (now - this.lastInteraction > 60_000 && this.stats.energy < 60 && Math.random() < 0.02) {
      this.sleep(now);
      return;
    }
    if (now >= this.wanderAt) {
      this.wanderAt = now + 4000 + Math.random() * 7000;
      if (Math.random() < 0.65) {
        const r = 60 + Math.random() * 120;
        const a = Math.random() * Math.PI * 2;
        const { w: sw, h: sh } = this.size;
        this.target = {
          x: clamp(this.x + Math.cos(a) * r, sw / 2 + 8, w.bounds.w - sw / 2 - 8),
          y: clamp(this.y + Math.sin(a) * r * 0.6, sh + 44, w.bounds.h - 16),
        };
      }
    }
  }

  private chatter(now: number): void {
    if (now < this.chatterAt) return;
    this.chatterAt = now + 12_000 + Math.random() * 14_000;
    const s = this.stats;
    if (s.hunger < 25) this.say(pick(LINES.hungry));
    else if (s.energy < 20) this.say(pick(LINES.tired));
    else if (s.happiness < 25) this.say(pick(LINES.sad));
    else if (Math.random() < 0.6) this.say(pick(LINES.idle));
  }

  private startEat(food: Food, w: World, now: number): void {
    w.foods.splice(w.foods.indexOf(food), 1);
    this.eating = food;
    this.eatTimer = 1.5;
    this.mood = 'eating';
    this.moodUntil = 0;
    this.target = null;
    this.lastInteraction = now;
    this.facing = food.x >= this.x ? 1 : -1;
    this.say(FOODS[food.kind].line, 1600);
  }

  private finishEat(now: number): void {
    const food = this.eating;
    this.eating = null;
    this.eatTimer = 0;
    if (!food) return;
    const { stats, overfed } = applyFood(this.stats, food.kind);
    this.stats = stats;
    this.fed = { ...this.fed, [food.kind]: (this.fed[food.kind] ?? 0) + 1 };
    if (food.kind === 'coffee') this.caffeineUntil = now + 12_000;
    this.emit({ type: 'ate', food, overfed });
    if (overfed) {
      this.setMood('sad', 2500, now);
      this.say(pick(LINES.overfed), 1800);
    } else {
      this.setMood('happy', 2500, now);
    }
    const next = stageForXp(this.stats.xp);
    if (next > this.stage) {
      this.evolveTo = next;
      this.evolveTimer = 1.8;
      this.mood = 'evolving';
      this.moodUntil = 0;
      this.emit({ type: 'evolve-start', to: next });
      this.say(pick(LINES.evolve), 1800);
    }
  }

  private finishEvolve(now: number): void {
    const from = this.stage;
    this.stage = this.evolveTo;
    this.evolveTo = -1;
    this.evolveTimer = 0;
    this.jumpV = -380;
    this.setMood('excited', 4000, now);
    this.emit({ type: 'evolved', from, to: this.stage });
    this.say(`✻ evolved → ${this.def.name}!`, 3200);
  }

  // ── persistence ────────────────────────────────────────────────

  toSave(): SaveData {
    return {
      version: 1,
      name: this.name,
      stats: { ...this.stats },
      stage: this.stage,
      fed: { ...this.fed },
      pokes: this.pokes,
      savedAt: Date.now(),
    };
  }

  /** Forget everything and start over as a fresh Haiku. */
  reset(now: number): void {
    this.name = 'claude';
    this.stats = { ...DEFAULT_STATS };
    this.stage = 0;
    this.fed = { token: 0, coffee: 0, bug: 0, commit: 0 };
    this.pokes = 0;
    this.mood = 'idle';
    this.moodUntil = 0;
    this.eatTimer = 0;
    this.eating = null;
    this.evolveTimer = 0;
    this.evolveTo = -1;
    this.target = null;
    this.caffeineUntil = 0;
    this.lastInteraction = now;
    this.say('hello, world', 2000);
  }
}
