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
  /** outfit unlocked (and auto-equipped) on reaching this stage */
  unlock: Outfit | null;
}

export const STAGES: readonly StageDef[] = [
  { name: 'Haiku', tagline: 'small, quick, curious', xp: 0, pixel: 6, speed: 75, unlock: null },
  { name: 'Sonnet', tagline: 'hard hat on — ready to build', xp: 60, pixel: 6, speed: 88, unlock: 'hardhat' },
  { name: 'Opus', tagline: 'wizard hat — casts refactors', xp: 180, pixel: 7, speed: 98, unlock: 'wizard' },
  { name: 'Mythos', tagline: 'crowned, confetti — it shipped', xp: 420, pixel: 8, speed: 112, unlock: 'party' },
];

export function stageForXp(xp: number): number {
  let s = 0;
  for (let i = 0; i < STAGES.length; i++) if (xp >= STAGES[i]!.xp) s = i;
  return s;
}

export function nextStage(stage: number): StageDef | null {
  return STAGES[stage + 1] ?? null;
}

/** Outfits available at a given stage (always includes 'none'). */
export function unlockedOutfits(stage: number): Outfit[] {
  const list: Outfit[] = ['none'];
  for (let i = 0; i <= stage && i < STAGES.length; i++) {
    const u = STAGES[i]!.unlock;
    if (u && !list.includes(u)) list.push(u);
  }
  return list;
}

/** Level is a smoother progress number than stage — purely cosmetic. */
export function levelForXp(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 8)) + 1;
}
