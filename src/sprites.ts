import type { FoodKind } from './types';

/**
 * Pixel maps. One string per row, one char per pixel.
 *   .  transparent        #  body (orange)     @  eye socket (body colour, eye drawn on top)
 *   +  dark accent        *  gold              c  cream
 *   g  green              k  coffee brown      w  white
 */
export type PixelMap = readonly string[];

export const COLORS = {
  bg: '#141413',
  body: '#D97757',
  eye: '#2A1B14',
  eyeShine: 'rgba(244,243,238,0.55)',
  cream: '#F4F3EE',
  gold: '#F2C14E',
  green: '#5FB57A',
  coffee: '#5C3B2E',
  white: '#FFFFFF',
  grid: 'rgba(244,243,238,0.055)',
} as const;

export const PALETTE: Readonly<Record<string, string>> = {
  '#': COLORS.body,
  '@': COLORS.body,
  '+': COLORS.eye,
  '*': COLORS.gold,
  c: COLORS.cream,
  g: COLORS.green,
  k: COLORS.coffee,
  w: COLORS.white,
};

// ── Stage 0 · Haiku ─────────────────────────────────── 14 × 8
const STAGE_0: PixelMap = [
  '..##########..',
  '..##########..',
  '..##@@##@@##..',
  '####@@##@@####',
  '##############',
  '..##########..',
  '..##########..',
  '..#..#..#..#..',
];

// ── Stage 1 · Sonnet (sprouts a ✻ antenna) ─────────── 16 × 11
const STAGE_1: PixelMap = [
  '.......*........',
  '......***.......',
  '.......#........',
  '...##########...',
  '...##########...',
  '...##@@##@@##...',
  '#####@@##@@#####',
  '################',
  '...##########...',
  '...##########...',
  '...#..#..#..#...',
];

// ── Stage 2 · Opus (glasses) ────────────────────────── 18 × 12
const STAGE_2: PixelMap = [
  '........*.........',
  '.......***........',
  '........#.........',
  '...############...',
  '...############...',
  '...############...',
  '...#+@@+##+@@+#...',
  '####+@@+##+@@+####',
  '##################',
  '...############...',
  '...############...',
  '...#...#..#...#...',
];

// ── Stage 3 · Mythos (crown) ────────────────────────── 20 × 10
const STAGE_3: PixelMap = [
  '....*.....*.....*...',
  '....************....',
  '...##############...',
  '...##############...',
  '...###@@@###@@@##...',
  '######@@@###@@@#####',
  '####################',
  '...##############...',
  '...##############...',
  '...#...#....#...#...',
];

export const STAGE_SPRITES: readonly PixelMap[] = [STAGE_0, STAGE_1, STAGE_2, STAGE_3];

export const FOOD_SPRITES: Readonly<Record<FoodKind, PixelMap>> = {
  token: [
    '.*****.',
    '*******',
    '**ccc**',
    '**c****',
    '**ccc**',
    '*******',
    '.*****.',
  ],
  coffee: [
    '.c.c...',
    '..c.c..',
    'ccccc..',
    'ckkkccc',
    'ckkkc.c',
    'ckkkccc',
    '.ccc...',
  ],
  bug: [
    'g.....g',
    '.g...g.',
    '..ggg..',
    '.ggggg.',
    'g.g+g.g',
    '.ggggg.',
    'g.g.g.g',
  ],
  commit: [
    '...c...',
    '...c...',
    '..ccc..',
    '.cc*cc.',
    '..ccc..',
    '...c...',
    '...c...',
  ],
};

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

/** Bounding boxes of the '@' eye sockets, left eye first. */
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
