import type { Outfit } from './sprites';

export interface StageDef {
  name: string;
  /** one-line flavour text shown on evolution */
  tagline: string;
  /** xp required to reach this stage */
  xp: number;
  /** canvas px per sprite pixel */
  pixel: number;
  /** walking speed, px/s */
  speed: number;
}

export const STAGES: readonly StageDef[] = [
  { name: 'Haiku', tagline: 'small, quick, curious', xp: 0, pixel: 6, speed: 75 },
  { name: 'Sonnet', tagline: 'grown into a builder', xp: 60, pixel: 6, speed: 88 },
  { name: 'Opus', tagline: 'deep thinker, long context', xp: 180, pixel: 7, speed: 98 },
  { name: 'Mythos', tagline: 'final form — now it just levels', xp: 420, pixel: 8, speed: 112 },
];

/** xp needed to reach a level; level itself is unbounded. */
export function xpForLevel(level: number): number {
  return 5 * Math.max(0, level - 1) ** 2;
}

export function levelForXp(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 5)) + 1;
}

export function stageForXp(xp: number): number {
  let s = 0;
  for (let i = 0; i < STAGES.length; i++) if (xp >= STAGES[i]!.xp) s = i;
  return s;
}

export function nextStage(stage: number): StageDef | null {
  return STAGES[stage + 1] ?? null;
}

// ── wardrobe ─────────────────────────────────────────────────────
// Outfits unlock purely by level, so progression keeps going long after
// Mythos, the last body evolution.

export interface Unlock {
  outfit: Outfit;
  level: number;
}

export const UNLOCKS: readonly Unlock[] = [
  { outfit: 'hardhat', level: 4 },
  { outfit: 'wizard', level: 7 },
  { outfit: 'basket', level: 9 },
  { outfit: 'party', level: 10 },
  { outfit: 'headphones', level: 12 },
  { outfit: 'beanie', level: 14 },
  { outfit: 'shades', level: 16 },
  { outfit: 'halo', level: 19 },
  { outfit: 'antenna', level: 22 },
  { outfit: 'cape', level: 26 },
];

export function unlockedOutfits(level: number): Outfit[] {
  return ['none', ...UNLOCKS.filter((u) => level >= u.level).map((u) => u.outfit)];
}

/** Outfits earned by crossing from `from` to `to` (exclusive of `from`). */
export function unlocksBetween(from: number, to: number): Unlock[] {
  return UNLOCKS.filter((u) => u.level > from && u.level <= to);
}

export function nextUnlock(level: number): Unlock | null {
  return UNLOCKS.find((u) => u.level > level) ?? null;
}
