import type { FoodKind } from './types';

/**
 * Pixel maps. One string per row, one char per pixel.
 *   .  transparent        #  body (orange)     @  eye (drawn by the renderer)
 *   +  dark accent        *  gold              c  cream       w  white
 *   g  green              k  coffee brown      r  grey        d  dark grey
 *   y  hard-hat yellow    o  hard-hat emblem   p  wizard purple
 */
export type PixelMap = readonly string[];

export const COLORS = {
  bg: '#141413',
  body: '#D97757',
  eye: '#1E1512',
  cream: '#F4F3EE',
  gold: '#F2C14E',
  green: '#5FB57A',
  coffee: '#5C3B2E',
  white: '#FFFFFF',
  grey: '#9A9A9A',
  darkGrey: '#5A5A5A',
  hatYellow: '#E9B949',
  hatEmblem: '#C77D2E',
  purple: '#5A4A9C',
  grid: 'rgba(244,243,238,0.055)',
} as const;

export const PALETTE: Readonly<Record<string, string>> = {
  '#': COLORS.body,
  '@': COLORS.body,
  '+': COLORS.eye,
  '*': COLORS.gold,
  c: COLORS.cream,
  w: COLORS.white,
  g: COLORS.green,
  k: COLORS.coffee,
  r: COLORS.grey,
  d: COLORS.darkGrey,
  y: COLORS.hatYellow,
  o: COLORS.hatEmblem,
  p: COLORS.purple,
};

// ── the mascot ───────────────────────────────────────────────────
// All poses share a 16 × 9 canvas so switching poses never shifts the body.
// Body: cols 2..12, rows 0..6 (top corners cut). Arms: col 1 / col 13. Legs: 4 × 1 px.

export type Pose = 'idle' | 'armup' | 'crawl';

const IDLE: PixelMap = [
  '...#########....',
  '..###########...',
  '..##@#####@##...',
  '.#############..',
  '.#############..',
  '..###########...',
  '..###########...',
  '....#.#.#.#.....',
  '....#.#.#.#.....',
];

/** right arm raised diagonally — waving / celebrating */
const ARMUP: PixelMap = [
  '...#########....',
  '..###########..#',
  '..##@#####@##.#.',
  '.#############..',
  '.############...',
  '..###########...',
  '..###########...',
  '....#.#.#.#.....',
  '....#.#.#.#.....',
];

/** crouched, front arm reaching, grey cable-tail behind — chasing the mouse (faces right) */
const CRAWL: PixelMap = [
  '................',
  '...#########....',
  '..###########...',
  '..##@#####@##...',
  'r##############.',
  'r##############.',
  'r.###########...',
  '.r###########...',
  '....#.#.#.#.....',
];

export const POSES: Readonly<Record<Pose, PixelMap>> = { idle: IDLE, armup: ARMUP, crawl: CRAWL };

/** where the head's top-left pixel sits per pose, relative to the idle pose */
export const POSE_HEAD_OFFSET: Readonly<Record<Pose, { x: number; y: number }>> = {
  idle: { x: 0, y: 0 },
  armup: { x: 0, y: 0 },
  crawl: { x: 0, y: 1 },
};

// ── outfits (overlays drawn after the body, in idle-map coordinates) ─────────

export type Outfit = 'none' | 'hardhat' | 'wizard' | 'party';
export const OUTFIT_NAMES: readonly Outfit[] = ['none', 'hardhat', 'wizard', 'party'];

export interface OutfitLayer {
  map: PixelMap;
  /** top-left in idle-map coordinates (negative = above the head) */
  x: number;
  y: number;
  /** only draw for these poses (default: all) */
  poses?: readonly Pose[];
}

export interface OutfitDef {
  label: string;
  /** rows the outfit extends above the head — used for bubbles and bounds */
  above: number;
  layers: readonly OutfitLayer[];
}

const HARD_HAT: PixelMap = ['..yyyyyyy..', '.yyyyoyyyy.', 'yyyyyyyyyyy'];
const WRENCH: PixelMap = ['r.r', 'rrr', '.r.', '.r.', '.r.'];
const WIZARD_HAT: PixelMap = [
  '.....p.....',
  '....pp.....',
  '....pwp....',
  '...pppp....',
  '...pwppp...',
  '..ppppwpp..',
  '.pppwppppp.',
  'ppppppppppp',
];
const CROWN: PixelMap = ['*..*..*', '*.***.*', '*******'];

export const OUTFITS: Readonly<Record<Outfit, OutfitDef>> = {
  none: { label: 'none', above: 0, layers: [] },
  hardhat: {
    label: 'hard hat & wrench',
    above: 4,
    layers: [
      { map: HARD_HAT, x: 2, y: -2 },
      { map: WRENCH, x: 14, y: 0, poses: ['idle', 'crawl'] },
      { map: WRENCH, x: 14, y: -4, poses: ['armup'] },
    ],
  },
  wizard: { label: 'wizard hat', above: 7, layers: [{ map: WIZARD_HAT, x: 2, y: -7 }] },
  party: { label: 'crown & confetti', above: 3, layers: [{ map: CROWN, x: 5, y: -3 }] },
};

// ── food ─────────────────────────────────────────────────────────

export const FOOD_SPRITES: Readonly<Record<FoodKind, PixelMap>> = {
  token: ['.*****.', '*******', '**ccc**', '**c****', '**ccc**', '*******', '.*****.'],
  coffee: ['.c.c...', '..c.c..', 'ccccc..', 'ckkkccc', 'ckkkc.c', 'ckkkccc', '.ccc...'],
  bug: ['g.....g', '.g...g.', '..ggg..', '.ggggg.', 'g.g+g.g', '.ggggg.', 'g.g.g.g'],
  commit: ['...c...', '...c...', '..ccc..', '.cc*cc.', '..ccc..', '...c...', '...c...'],
};

// ── helpers ──────────────────────────────────────────────────────

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function mapSize(map: PixelMap): { cols: number; rows: number } {
  return { cols: map[0]?.length ?? 0, rows: map.length };
}

/** Returns null when valid, otherwise a description of the problem. */
export function validateMap(map: PixelMap): string | null {
  if (map.length === 0) return 'empty map';
  const w = map[0]?.length ?? 0;
  for (let i = 0; i < map.length; i++) {
    const row = map[i] ?? '';
    if (row.length !== w) return `row ${i} has width ${row.length}, expected ${w}`;
    for (const ch of row) {
      if (ch !== '.' && !(ch in PALETTE)) return `row ${i} has unknown char '${ch}'`;
    }
  }
  return null;
}

/** Bounding boxes of the '@' eye pixels, left eye first. */
export function eyeBoxes(map: PixelMap): Box[] {
  const { cols } = mapSize(map);
  const mid = cols / 2;
  const acc: Array<{ minX: number; minY: number; maxX: number; maxY: number } | null> = [null, null];
  map.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] !== '@') continue;
      const side = x < mid ? 0 : 1;
      const b = acc[side];
      if (!b) acc[side] = { minX: x, minY: y, maxX: x, maxY: y };
      else {
        b.minX = Math.min(b.minX, x);
        b.minY = Math.min(b.minY, y);
        b.maxX = Math.max(b.maxX, x);
        b.maxY = Math.max(b.maxY, y);
      }
    }
  });
  return acc
    .filter((b): b is NonNullable<typeof b> => b !== null)
    .map((b) => ({ x: b.minX, y: b.minY, w: b.maxX - b.minX + 1, h: b.maxY - b.minY + 1 }));
}

/** Contiguous runs of body pixels on the bottom row — the legs. */
export function legRuns(map: PixelMap): Array<[number, number]> {
  const row = map[map.length - 1] ?? '';
  const runs: Array<[number, number]> = [];
  let start = -1;
  for (let x = 0; x <= row.length; x++) {
    const solid = x < row.length && row[x] !== '.';
    if (solid && start < 0) start = x;
    if (!solid && start >= 0) {
      runs.push([start, x - 1]);
      start = -1;
    }
  }
  return runs;
}

/** How many rows from the bottom are leg rows (identical to the last row). */
export function legRowCount(map: PixelMap): number {
  const last = map[map.length - 1];
  let n = 0;
  for (let i = map.length - 1; i >= 0 && map[i] === last; i--) n++;
  return n;
}
