import type { FoodKind, Stats } from './types';

export const clamp = (v: number, lo = 0, hi = 100): number => Math.min(hi, Math.max(lo, v));

export interface FoodDef {
  label: string;
  hunger: number;
  energy: number;
  happiness: number;
  xp: number;
  /** what the pet says while eating */
  line: string;
  /** what the log says */
  effect: string;
}

export const FOODS: Readonly<Record<FoodKind, FoodDef>> = {
  token: { label: 'token', hunger: 22, energy: 0, happiness: 4, xp: 10, line: 'nom nom nom', effect: 'context refilled' },
  coffee: { label: 'coffee', hunger: 4, energy: 35, happiness: 6, xp: 8, line: 'caffeinated!', effect: 'speed boost for 12s' },
  bug: { label: 'bug', hunger: 8, energy: -4, happiness: 22, xp: 15, line: 'bug fixed ✓', effect: 'very satisfying' },
  commit: { label: 'commit', hunger: 10, energy: 5, happiness: 12, xp: 30, line: 'committed ✓', effect: 'big xp' },
};

export const DEFAULT_STATS: Stats = { hunger: 70, energy: 80, happiness: 70, xp: 0 };

/** Stat drain per second while the pet is awake. */
export const DECAY = { hunger: 0.25, energy: 0.1, happiness: 0.05, happinessStressed: 0.15 } as const;

export interface FeedResult {
  stats: Stats;
  overfed: boolean;
}

export function applyFood(s: Stats, kind: FoodKind): FeedResult {
  const f = FOODS[kind];
  const overfed = s.hunger > 92;
  return {
    overfed,
    stats: {
      hunger: clamp(s.hunger + f.hunger),
      energy: clamp(s.energy + f.energy),
      happiness: clamp(s.happiness + (overfed ? -6 : f.happiness)),
      xp: Math.max(0, s.xp + (overfed ? Math.ceil(f.xp / 2) : f.xp)),
    },
  };
}

/** Per-second stat drift while the page is open. */
export function decay(s: Stats, dt: number, sleeping: boolean): Stats {
  if (sleeping) {
    return { ...s, hunger: clamp(s.hunger - 0.08 * dt), energy: clamp(s.energy + 1.2 * dt) };
  }
  const stressed = s.hunger < 25 || s.energy < 15;
  return {
    ...s,
    hunger: clamp(s.hunger - DECAY.hunger * dt),
    energy: clamp(s.energy - DECAY.energy * dt),
    happiness: clamp(s.happiness - (stressed ? DECAY.happinessStressed : DECAY.happiness) * dt),
  };
}

/**
 * Drift applied for time spent away. Hunger runs down much faster than it used
 * to, but both hunger and joy have a floor: you always come back to a hungry
 * pet, never to a broken one.
 */
export function offlineDecay(s: Stats, elapsedMs: number): Stats {
  const sec = Math.min(Math.max(elapsedMs / 1000, 0), 3 * 60 * 60);
  return {
    ...s,
    hunger: clamp(s.hunger - 0.03 * sec, 8),
    energy: clamp(s.energy + 0.02 * sec),
    happiness: clamp(s.happiness - 0.008 * sec, 20),
  };
}

export function moodFromStats(s: Stats): 'happy' | 'idle' | 'sad' {
  if (s.hunger < 20 || s.happiness < 25 || s.energy < 12) return 'sad';
  if (s.happiness > 75 && s.hunger > 40) return 'happy';
  return 'idle';
}
