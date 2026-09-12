import { STAGE_SPRITES, type PixelMap } from './sprites';

export interface StageDef {
  /** display name */
  name: string;
  /** one-line flavour text shown on evolution */
  tagline: string;
  /** xp required to reach this stage */
  xp: number;
  sprite: PixelMap;
  /** canvas px per sprite pixel */
  pixel: number;
  /** walking speed, px/s */
  speed: number;
}

export const STAGES: readonly StageDef[] = [
  { name: 'Haiku', tagline: 'small, quick, curious', xp: 0, sprite: STAGE_SPRITES[0]!, pixel: 6, speed: 75 },
  { name: 'Sonnet', tagline: 'grew a ✻ antenna — it thinks now', xp: 60, sprite: STAGE_SPRITES[1]!, pixel: 6, speed: 88 },
  { name: 'Opus', tagline: 'put on glasses — reads every file', xp: 180, sprite: STAGE_SPRITES[2]!, pixel: 7, speed: 98 },
  { name: 'Mythos', tagline: 'crowned — context window unbounded', xp: 420, sprite: STAGE_SPRITES[3]!, pixel: 8, speed: 112 },
];

export function stageForXp(xp: number): number {
  let s = 0;
  for (let i = 0; i < STAGES.length; i++) if (xp >= STAGES[i]!.xp) s = i;
  return s;
}

export function nextStage(stage: number): StageDef | null {
  return STAGES[stage + 1] ?? null;
}

/** Level is a smoother progress number than stage — purely cosmetic. */
export function levelForXp(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 8)) + 1;
}
