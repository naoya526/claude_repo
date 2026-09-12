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
  /** outfit granted by reaching this stage */
  unlock: Outfit | null;
}

export const STAGES: readonly StageDef[] = [
  { name: 'Haiku', tagline: 'small, quick, curious', xp: 0, pixel: 6, speed: 75, unlock: null },
  { name: 'Sonnet', tagline: 'grown into a builder', xp: 60, pixel: 6, speed: 88, unlock: 'hardhat' },
  { name: 'Opus', tagline: 'deep thinker, long context', xp: 180, pixel: 7, speed: 98, unlock: 'wizard' },
  { name: 'Fable', tagline: 'final form — the wardrobe opens up', xp: 420, pixel: 8, speed: 112, unlock: 'party' },
];

export const FINAL_STAGE = STAGES.length - 1;

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
// The first outfits ride along with the body evolutions, one per stage.
// Everything else is earned by levelling up *after* the last evolution, so the
// wardrobe is what keeps progression going once the pet stops growing.

export interface Unlock {
  outfit: Outfit;
  level: number;
}

export const LEVEL_UNLOCKS: readonly Unlock[] = [
  { outfit: 'basket', level: 12 },
  { outfit: 'headphones', level: 14 },
  { outfit: 'beanie', level: 16 },
  { outfit: 'shades', level: 18 },
  { outfit: 'halo', level: 21 },
  { outfit: 'antenna', level: 24 },
  { outfit: 'cape', level: 28 },
];

/** Outfits granted by evolutions, in stage order. */
export function stageUnlocks(): Array<{ outfit: Outfit; stage: number }> {
  return STAGES.flatMap((s, i) => (s.unlock ? [{ outfit: s.unlock, stage: i }] : []));
}

export function unlockedOutfits(stage: number, level: number): Outfit[] {
  const list: Outfit[] = ['none'];
  for (let i = 0; i <= stage && i < STAGES.length; i++) {
    const u = STAGES[i]!.unlock;
    if (u) list.push(u);
  }
  if (stage >= FINAL_STAGE) {
    for (const u of LEVEL_UNLOCKS) if (level >= u.level) list.push(u.outfit);
  }
  return list;
}

/** How an outfit is earned, as a short label for the log and the wardrobe list. */
export function unlockRequirement(outfit: Outfit): string {
  const st = STAGES.find((s) => s.unlock === outfit);
  if (st) return st.name;
  const u = LEVEL_UNLOCKS.find((x) => x.outfit === outfit);
  return u ? `lv ${u.level}` : '—';
}

export function nextUnlock(stage: number, level: number): { outfit: Outfit; requirement: string } | null {
  for (let i = stage + 1; i < STAGES.length; i++) {
    const u = STAGES[i]!.unlock;
    if (u) return { outfit: u, requirement: STAGES[i]!.name };
  }
  if (stage >= FINAL_STAGE) {
    const u = LEVEL_UNLOCKS.find((x) => x.level > level);
    if (u) return { outfit: u.outfit, requirement: `lv ${u.level}` };
  }
  return null;
}

/** Total number of outfits, including "none". */
export function wardrobeSize(): number {
  return 1 + stageUnlocks().length + LEVEL_UNLOCKS.length;
}
