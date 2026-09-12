import type { Pet, Food } from './pet';
import type { Tool, Vec } from './types';
import {
  BASKET,
  BASKET_AT,
  BASKET_SLOT,
  BERRY_TIP,
  BUSH,
  COLORS,
  FOOD_SPRITES,
  OUTFITS,
  PALETTE,
  POSES,
  POSE_HEAD_OFFSET,
  eyeBoxes,
  legRowCount,
  legRuns,
  mapSize,
  type PixelMap,
} from './sprites';
import { Particles } from './particles';

export interface Bubble {
  text: string;
  until: number;
}

const eyeCache = new WeakMap<PixelMap, ReturnType<typeof eyeBoxes>>();
const legCache = new WeakMap<PixelMap, { runs: ReturnType<typeof legRuns>; rows: number }>();
const eyesOf = (m: PixelMap) => {
  let v = eyeCache.get(m);
  if (!v) eyeCache.set(m, (v = eyeBoxes(m)));
  return v;
};
const legsOf = (m: PixelMap) => {
  let v = legCache.get(m);
  if (!v) legCache.set(m, (v = { runs: legRuns(m), rows: legRowCount(m) }));
  return v;
};

interface DrawOpts {
  tint?: string | null;
  /** hide legs with this parity (walk cycle) */
  skipLegs?: 0 | 1 | null;
  /** mirror horizontally inside a canvas of `flipCols` columns */
  flipCols?: number | null;
}

export class Renderer {
  readonly ctx: CanvasRenderingContext2D;
  w = 0;
  h = 0;
  private dpr = 1;

  constructor(readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2d context unavailable');
    this.ctx = ctx;
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = Math.max(1, Math.round(rect.width));
    this.h = Math.max(1, Math.round(rect.height));
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
  }

  begin(): void {
    const c = this.ctx;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.imageSmoothingEnabled = false;
    c.fillStyle = COLORS.bg;
    c.fillRect(0, 0, this.w, this.h);
    c.fillStyle = COLORS.grid;
    const step = 24;
    for (let y = step; y < this.h; y += step) for (let x = step; x < this.w; x += step) c.fillRect(x, y, 1, 1);
  }

  // ── sprites ────────────────────────────────────────────────────

  /**
   * Draw a pixel map with its (0,0) cell at canvas (ox, oy). Cells may be negative /
   * beyond the map when drawing overlays; `flipCols` mirrors columns within that width.
   */
  drawMap(map: PixelMap, ox: number, oy: number, px: number, opts: DrawOpts = {}, cellX = 0, cellY = 0): void {
    const c = this.ctx;
    const { cols, rows } = mapSize(map);
    const legs = opts.skipLegs == null ? null : legsOf(map);
    for (let y = 0; y < rows; y++) {
      const row = map[y] ?? '';
      const isLegRow = legs !== null && y >= rows - legs.rows;
      for (let x = 0; x < cols; x++) {
        const ch = row[x] ?? '.';
        if (ch === '.') continue;
        if (isLegRow && legs && opts.skipLegs != null) {
          const idx = legs.runs.findIndex(([a, b]) => x >= a && x <= b);
          if (idx >= 0 && idx % 2 === opts.skipLegs) continue;
        }
        c.fillStyle = opts.tint ?? PALETTE[ch] ?? COLORS.cream;
        const gx = cellX + x;
        const dx = opts.flipCols != null ? opts.flipCols - 1 - gx : gx;
        c.fillRect(ox + dx * px, oy + (cellY + y) * px, px, px);
      }
    }
  }

  drawPet(pet: Pet, cursor: Vec | null, now: number): void {
    const c = this.ctx;
    const px = pet.def.pixel;
    const pose = pet.pose();
    const map = POSES[pose];
    const { cols, rows } = mapSize(map);
    const w = cols * px;
    const h = rows * px;
    const flip = pet.facing < 0;
    const flipCols = flip ? cols : null;

    // shadow
    c.fillStyle = 'rgba(0,0,0,0.35)';
    c.beginPath();
    const shadowScale = 1 - Math.min(0.5, -pet.jump / 120);
    c.ellipse(pet.x, pet.y + 2, (w / 2) * 0.72 * shadowScale, 4 * shadowScale, 0, 0, Math.PI * 2);
    c.fill();

    // idle bob / walk bob (whole pixels only, keeps it crisp)
    let bob = 0;
    if (pet.moving) bob = Math.floor(pet.walkPhase) % 2 === 0 ? 0 : -px * 0.5;
    else if (pet.sleeping) bob = Math.sin(pet.t * 1.2) > 0 ? px * 0.5 : 0;
    else bob = Math.sin(pet.t * 2.2) > 0.6 ? -px * 0.5 : 0;

    const evolving = pet.evolveTimer > 0;
    const jitter = evolving ? (Math.random() - 0.5) * 6 : 0;
    const tint = evolving && Math.floor(pet.evolveTimer * 12) % 2 === 0 ? COLORS.cream : null;

    c.save();
    c.translate(pet.x + jitter, pet.y + pet.jump);
    const sq = pet.squish;
    c.scale(1 + sq * 0.22, 1 - sq * 0.22);
    const ox = -w / 2;
    const oy = -h + bob;
    const off = POSE_HEAD_OFFSET[pose];
    /** sprite cell (may be fractional) → canvas x, honouring the flip */
    const cx = (gx: number): number => ox + (flip ? cols - 1 - gx : gx) * px;
    const cy = (gy: number): number => oy + (gy + off.y) * px;
    const outfit = OUTFITS[pet.outfit];

    for (const layer of outfit.layers) {
      if (!layer.behind) continue;
      if (layer.poses && !layer.poses.includes(pose)) continue;
      this.drawMap(layer.map, ox, oy, px, { tint, flipCols }, layer.x + off.x, layer.y + off.y);
    }

    const skipLegs: 0 | 1 | null = pet.moving ? ((Math.floor(pet.walkPhase) % 2) as 0 | 1) : null;
    this.drawMap(map, ox, oy, px, { tint, skipLegs, flipCols });

    // eyes — 1 px each; they glance toward the cursor by sliding half a pixel
    const style = pet.eyeStyle(now);
    const look = pet.look(cursor);
    c.fillStyle = COLORS.eye;
    for (const b of eyesOf(map)) {
      const bx = flip ? cols - b.x - b.w : b.x;
      const ex = ox + bx * px;
      const ey = oy + b.y * px;
      const ew = b.w * px;
      const eh = b.h * px;
      if (tint) {
        c.fillRect(ex, ey, ew, eh);
        continue;
      }
      switch (style) {
        case 'open':
          c.fillRect(ex + look.x * px * 0.5, ey + look.y * px * 0.35, ew, eh);
          break;
        case 'closed':
          c.fillRect(ex - px * 0.25, ey + eh * 0.4, ew + px * 0.5, Math.max(1, eh * 0.28));
          break;
        case 'happy':
          c.fillRect(ex - px * 0.25, ey, ew + px * 0.5, Math.max(1, eh * 0.3));
          c.fillRect(ex - px * 0.25, ey, px * 0.3, eh * 0.6);
          c.fillRect(ex + ew - px * 0.05, ey, px * 0.3, eh * 0.6);
          break;
        case 'sad':
          c.fillRect(ex, ey + eh * 0.45, ew, eh * 0.55);
          break;
      }
    }

    // mouth while eating
    if (pet.eatTimer > 0) {
      const eyes = eyesOf(map);
      const l = eyes[0];
      const r = eyes[1] ?? l;
      if (l && r) {
        const mx = ox + ((l.x + l.w + r.x) / 2) * px;
        const my = oy + (l.y + l.h + 1) * px;
        const open = Math.floor(pet.eatTimer * 8) % 2 === 0;
        c.fillStyle = COLORS.eye;
        c.fillRect(Math.round(mx - px * 1.5), my, px * 3, open ? px * 1.2 : px * 0.5);
      }
    }

    // the foraging basket, slung on the trailing side, with its berries showing
    if (pet.showBasket && !tint) {
      this.drawMap(BASKET, ox, oy, px, { flipCols }, BASKET_AT.x + off.x, BASKET_AT.y + off.y);
      c.fillStyle = COLORS.berry;
      for (let i = 0; i < Math.min(pet.basket, 4); i++) c.fillRect(cx(BASKET_AT.x + i), cy(BASKET_AT.y + 2), px, px);
    }

    // outfit overlays (idle-map coordinates, shifted per pose)
    for (const layer of outfit.layers) {
      if (layer.behind) continue;
      if (layer.poses && !layer.poses.includes(pose)) continue;
      this.drawMap(layer.map, ox, oy, px, { tint, flipCols }, layer.x + off.x, layer.y + off.y);
    }

    // the berry: held at the fingertip, then lobbed over the head into the basket
    const p = pet.pickProgress();
    if (p && p.phase !== 'settle') {
      let gx = BERRY_TIP.x;
      let gy = BERRY_TIP.y;
      if (p.phase === 'toss') {
        gx = BERRY_TIP.x + (BASKET_SLOT.x - BERRY_TIP.x) * p.t;
        gy = BERRY_TIP.y + (BASKET_SLOT.y - BERRY_TIP.y) * p.t - Math.sin(Math.PI * p.t) * 3.5;
      }
      c.fillStyle = COLORS.berry;
      c.fillRect(Math.round(cx(gx)), Math.round(cy(gy)), px, px);
      c.fillStyle = COLORS.berryLight;
      c.fillRect(Math.round(cx(gx)), Math.round(cy(gy)), px / 2, px / 2);
    }

    // caffeine sparkle
    if (pet.caffeinated && Math.floor(now / 120) % 2 === 0) {
      c.fillStyle = COLORS.gold;
      c.fillRect(ox + w - px, oy - (outfit.above + 2) * px, px, px);
    }

    c.restore();
  }

  /** The raspberry bush the pet forages from. Returns its canopy box in canvas px. */
  drawBush(at: Vec, now: number): { x: number; y: number; w: number; h: number } {
    const px = 5;
    const { cols, rows } = mapSize(BUSH);
    const w = cols * px;
    const h = rows * px;
    const x = Math.round(at.x - w / 2);
    const y = Math.round(at.y - h);
    const c = this.ctx;
    c.fillStyle = 'rgba(0,0,0,0.3)';
    c.beginPath();
    c.ellipse(at.x, at.y, w * 0.4, 4, 0, 0, Math.PI * 2);
    c.fill();
    const sway = Math.sin(now / 900) > 0 ? 0 : px;
    this.drawMap(BUSH, x + sway, y, px);
    return { x, y, w, h: h - px * 2 };
  }

  drawFood(f: Food, now: number): void {
    const px = 4;
    const map = FOOD_SPRITES[f.kind];
    const { cols, rows } = mapSize(map);
    const bob = Math.sin(now / 280 + f.id) > 0 ? -2 : 0;
    const c = this.ctx;
    c.fillStyle = 'rgba(0,0,0,0.3)';
    c.beginPath();
    c.ellipse(f.x, f.y + 2, (cols * px) / 2, 2.5, 0, 0, Math.PI * 2);
    c.fill();
    this.drawMap(map, Math.round(f.x - (cols * px) / 2), Math.round(f.y - rows * px + bob), px);
  }

  drawCursor(cursor: Vec | null, tool: Tool, now: number): void {
    if (!cursor) return;
    const c = this.ctx;
    if (tool === 'cursor') {
      if (Math.floor(now / 500) % 2 === 0) {
        c.fillStyle = COLORS.body;
        c.globalAlpha = 0.85;
        c.fillRect(Math.round(cursor.x) - 4, Math.round(cursor.y) - 8, 8, 16);
        c.globalAlpha = 1;
      }
      return;
    }
    const map = FOOD_SPRITES[tool];
    const { cols, rows } = mapSize(map);
    c.globalAlpha = 0.8;
    this.drawMap(map, Math.round(cursor.x - (cols * 4) / 2), Math.round(cursor.y - rows * 4), 4);
    c.globalAlpha = 1;
  }

  drawBubble(b: Bubble | null, pet: Pet, now: number): void {
    if (!b || now > b.until) return;
    const c = this.ctx;
    const top = pet.top;
    const fade = Math.min(1, (b.until - now) / 250);
    c.globalAlpha = fade;
    c.font = '12px ui-monospace, "JetBrains Mono", Menlo, monospace';
    c.textBaseline = 'middle';
    c.textAlign = 'left';
    const padX = 8;
    const tw = Math.ceil(c.measureText(b.text).width);
    const bw = tw + padX * 2;
    const bh = 22;
    let bx = Math.round(top.x - bw / 2);
    bx = Math.max(6, Math.min(this.w - bw - 6, bx));
    const by = Math.max(4, Math.round(top.y - bh - 10));
    c.fillStyle = COLORS.cream;
    c.fillRect(bx, by, bw, bh);
    const tx = Math.round(Math.max(bx + 6, Math.min(bx + bw - 10, top.x - 2)));
    c.fillRect(tx, by + bh, 4, 3);
    c.fillRect(tx + 1, by + bh + 3, 2, 2);
    c.fillStyle = COLORS.bg;
    c.fillText(b.text, bx + padX, by + bh / 2 + 1);
    c.globalAlpha = 1;
  }

  drawParticles(p: Particles): void {
    p.draw(this.ctx);
  }

  drawSleepDim(pet: Pet): void {
    if (!pet.sleeping) return;
    const c = this.ctx;
    c.fillStyle = 'rgba(10,12,20,0.35)';
    c.fillRect(0, 0, this.w, this.h);
  }

  /** Small helper for the tray icons. */
  static renderIcon(canvas: HTMLCanvasElement, map: PixelMap): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { cols, rows } = mapSize(map);
    canvas.width = cols;
    canvas.height = rows;
    for (let y = 0; y < rows; y++) {
      const row = map[y] ?? '';
      for (let x = 0; x < cols; x++) {
        const ch = row[x] ?? '.';
        if (ch === '.') continue;
        ctx.fillStyle = PALETTE[ch] ?? COLORS.cream;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
}
