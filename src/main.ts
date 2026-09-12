import './style.css';
import { Pet, type Food, type World } from './pet';
import { Renderer, type Bubble } from './renderer';
import { Particles } from './particles';
import { UI } from './ui';
import { runCommand } from './commands';
import { clearSave, loadSave, writeSave } from './storage';
import { FOOD_KINDS, type FoodKind, type Tool, type Vec } from './types';
import { FOODS } from './logic';
import { STAGES } from './evolution';
import { STAGE_SPRITES, FOOD_SPRITES, validateMap } from './sprites';

// ── sanity check the pixel art in dev ────────────────────────────
if (import.meta.env.DEV) {
  for (const m of [...STAGE_SPRITES, ...Object.values(FOOD_SPRITES)]) {
    const err = validateMap(m);
    if (err) console.error('bad sprite:', err, m);
  }
}

const ui = new UI();
const renderer = new Renderer(ui.canvas);
const particles = new Particles();
const now = (): number => performance.now();

const save = loadSave();
const pet = new Pet(save, now());

const world: World = { now: now(), foods: [], cursor: null, cursorMovedAt: -Infinity, bounds: { w: 0, h: 0 } };
let tool: Tool = 'cursor';
let bubble: Bubble | null = null;
let foodId = 1;
let placed = false;
let lastSave = now();
let lastZ = 0;
let lastCrumb = 0;
const startedAt = now();

// ── helpers ──────────────────────────────────────────────────────

function setTool(t: Tool): void {
  tool = t;
  ui.setTool(t);
}

function spawnFood(kind: FoodKind, at?: Vec): boolean {
  if (world.foods.length >= 6) return false;
  const b = world.bounds;
  const p: Vec = at ?? {
    x: 40 + Math.random() * Math.max(1, b.w - 80),
    y: 60 + Math.random() * Math.max(1, b.h - 80),
  };
  p.x = Math.max(20, Math.min(b.w - 20, p.x));
  p.y = Math.max(50, Math.min(b.h - 8, p.y));
  const f: Food = { id: foodId++, kind, x: p.x, y: p.y, born: now() };
  world.foods.push(f);
  ui.log(`Drop(${FOODS[kind].label}) at (${Math.round(p.x)}, ${Math.round(p.y)})`, 'act');
  if (pet.sleeping) ui.log('…but claude is asleep. poke to wake', 'sub');
  ui.hideHint();
  return true;
}

function doSave(): boolean {
  lastSave = now();
  return writeSave(pet.toSave());
}

function resetAll(): void {
  clearSave();
  world.foods.length = 0;
  pet.reset(now());
  placeInitially();
  ui.clearLog();
  ui.log('pet reset — a fresh Haiku hatches', 'sys');
  doSave();
}

function placeInitially(): void {
  const { w, h } = world.bounds;
  pet.x = w / 2;
  pet.y = h * 0.62;
}

function fmtUptime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

// ── pet events → UI ──────────────────────────────────────────────

function drainEvents(): void {
  for (const e of pet.events) {
    switch (e.type) {
      case 'log':
        ui.log(e.text, e.cls as 'act');
        break;
      case 'bubble':
        bubble = { text: e.text, until: now() + (e.ms ?? 2400) };
        break;
      case 'poked':
        particles.spawn('heart', pet.head.x + (Math.random() - 0.5) * 20, pet.head.y - 4, 3);
        break;
      case 'ate': {
        const f = FOODS[e.food.kind];
        ui.log(`Eat(${f.label})`, 'act');
        ui.log(e.overfed ? `overfed! −joy, half xp` : `+${f.hunger} hunger · +${f.xp} xp · ${f.effect}`, 'sub');
        ui.updateCounts(pet.fed);
        break;
      }
      case 'evolve-start':
        ui.log('Compacting context…', 'sys');
        break;
      case 'evolved': {
        const st = STAGES[e.to];
        ui.log(`Evolved: ${STAGES[e.from]?.name} → ${st?.name}`, 'sys');
        ui.log(st?.tagline ?? '', 'sub');
        particles.spawn('spark', pet.center.x, pet.center.y, 40);
        particles.spawn('star', pet.head.x, pet.head.y, 6);
        doSave();
        break;
      }
      case 'slept':
        ui.log(`${pet.name} fell asleep`, 'act');
        ui.log('energy recovers while sleeping · poke to wake', 'sub');
        break;
      case 'woke':
        ui.log(`${pet.name} woke up`, 'act');
        break;
    }
  }
  pet.events.length = 0;
}

// ── input ────────────────────────────────────────────────────────

function canvasPoint(ev: PointerEvent): Vec {
  const r = ui.canvas.getBoundingClientRect();
  return { x: ev.clientX - r.left, y: ev.clientY - r.top };
}

ui.canvas.addEventListener('pointermove', (ev) => {
  const p = canvasPoint(ev);
  if (!world.cursor || Math.hypot(p.x - world.cursor.x, p.y - world.cursor.y) > 1.5) world.cursorMovedAt = now();
  world.cursor = p;
});
ui.canvas.addEventListener('pointerleave', () => {
  world.cursor = null;
});
ui.canvas.addEventListener('pointerdown', (ev) => {
  const p = canvasPoint(ev);
  world.cursor = p;
  world.cursorMovedAt = now();
  ui.hideHint();
  if (tool !== 'cursor') {
    spawnFood(tool, p);
    if (ev.pointerType === 'touch') setTool('cursor');
    return;
  }
  if (pet.hitTest(p)) {
    pet.poke(now());
    ui.log(`Poke(${pet.name})`, 'act');
  } else {
    pet.setTarget(p, now());
  }
});
ui.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

window.addEventListener('keydown', (ev) => {
  if (ui.inputFocused) return;
  if (ev.key === '/') {
    ev.preventDefault();
    ui.focusInput();
    return;
  }
  if (ev.key === 'Escape' || ev.key === '0') return setTool('cursor');
  const n = Number(ev.key);
  if (n >= 1 && n <= FOOD_KINDS.length) setTool(FOOD_KINDS[n - 1] ?? 'cursor');
  if (ev.key === ' ') {
    ev.preventDefault();
    pet.poke(now());
  }
});

ui.onSelectTool = setTool;
ui.onCommand = (text) =>
  runCommand(text, {
    pet,
    ui,
    now,
    spawnFood,
    reset: resetAll,
    save: doSave,
  });

// ── resize ───────────────────────────────────────────────────────

function onResize(): void {
  renderer.resize();
  world.bounds = { w: renderer.w, h: renderer.h };
  if (!placed && renderer.w > 1) {
    placeInitially();
    placed = true;
  }
}
new ResizeObserver(onResize).observe(ui.stageWrap);
onResize();

// ── boot log ─────────────────────────────────────────────────────

ui.setTool('cursor');
ui.updateCounts(pet.fed);
ui.log(`claude-pet v0.1.0 · session started`, 'sys');
if (save) {
  const away = Date.now() - save.savedAt;
  ui.log(`Loaded ${pet.name} (${pet.def.name}, stage ${pet.stage + 1}) from localStorage`, 'act');
  if (away > 60_000) ui.log(`away for ${Math.round(away / 60_000)} min — stats drifted a little`, 'sub');
  bubble = { text: 'welcome back', until: now() + 2600 };
} else {
  ui.log('No save found — a Haiku hatches', 'act');
  ui.log('poke it, move your mouse, drop food. /help for commands', 'sub');
  bubble = { text: "hi! I'm claude ✻", until: now() + 3200 };
}

// ── main loop ────────────────────────────────────────────────────

let last = now();
function frame(): void {
  const t = now();
  const dt = Math.min(0.05, (t - last) / 1000);
  last = t;
  world.now = t;

  pet.update(dt, world);
  drainEvents();
  particles.update(dt);

  if (pet.sleeping && t - lastZ > 900) {
    lastZ = t;
    particles.spawn('z', pet.head.x + pet.size.w * 0.3, pet.head.y + 4);
  }
  if (pet.eatTimer > 0 && t - lastCrumb > 140) {
    lastCrumb = t;
    particles.spawn('crumb', pet.center.x + (Math.random() - 0.5) * 10, pet.center.y + 6, 2);
  }
  if (pet.mood === 'excited' && Math.random() < 0.15) particles.spawn('star', pet.head.x + (Math.random() - 0.5) * pet.size.w, pet.head.y, 1);

  renderer.begin();
  for (const f of world.foods) renderer.drawFood(f, t);
  renderer.drawPet(pet, world.cursor, t);
  renderer.drawSleepDim(pet);
  renderer.drawParticles(particles);
  renderer.drawBubble(bubble, pet, t);
  renderer.drawCursor(world.cursor, tool, t);

  ui.renderStats(pet);
  if (Math.floor(t / 1000) !== Math.floor((t - dt * 1000) / 1000)) {
    ui.setStatus(
      `✻ <b>${pet.name}</b> · ${pet.mood}${pet.caffeinated ? ' · ☕' : ''}`,
      `snacks ${world.foods.length} · uptime ${fmtUptime(t - startedAt)} · autosave ✓`,
    );
  }

  if (t - lastSave > 4000) doSave();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') doSave();
  else last = now();
});
window.addEventListener('beforeunload', () => doSave());
