import type { SaveData } from './types';

const KEY = 'claude-pet:v1';

export function loadSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<SaveData>;
    if (data.version !== 1 || !data.stats || typeof data.stage !== 'number') return null;
    return data as SaveData;
  } catch {
    return null;
  }
}

export function writeSave(data: SaveData): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
