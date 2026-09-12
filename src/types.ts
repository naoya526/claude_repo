export type FoodKind = 'token' | 'coffee' | 'bug' | 'commit';
export const FOOD_KINDS: readonly FoodKind[] = ['token', 'coffee', 'bug', 'commit'];

export type Tool = 'cursor' | FoodKind;

export type Mood = 'idle' | 'happy' | 'excited' | 'eating' | 'sleeping' | 'sad' | 'evolving';
export type EyeStyle = 'open' | 'closed' | 'happy' | 'sad';

export interface Stats {
  hunger: number;
  energy: number;
  happiness: number;
  xp: number;
}

export interface Vec {
  x: number;
  y: number;
}

export interface SaveData {
  version: 1;
  name: string;
  stats: Stats;
  stage: number;
  /** optional for saves written before outfits existed */
  outfit?: string;
  fed: Record<FoodKind, number>;
  pokes: number;
  savedAt: number;
}
