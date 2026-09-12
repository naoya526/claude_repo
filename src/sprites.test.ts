import { describe, expect, it } from 'vitest';
import { FOOD_SPRITES, OUTFITS, POSES, eyeBoxes, legRowCount, legRuns, mapSize, validateMap } from './sprites';
import { STAGES, unlockedOutfits } from './evolution';

describe('pixel maps', () => {
  it('pose sprites are rectangular, use known chars and share one canvas', () => {
    const base = mapSize(POSES.idle);
    for (const [name, m] of Object.entries(POSES)) {
      expect(validateMap(m), name).toBeNull();
      expect(mapSize(m), name).toEqual(base);
    }
  });

  it('food sprites are rectangular and use known chars', () => {
    for (const [k, m] of Object.entries(FOOD_SPRITES)) expect(validateMap(m), k).toBeNull();
  });

  it('outfit layers are valid and declare how far they rise above the head', () => {
    for (const [name, o] of Object.entries(OUTFITS)) {
      for (const l of o.layers) {
        expect(validateMap(l.map), name).toBeNull();
        expect(-l.y, name).toBeLessThanOrEqual(o.above);
      }
    }
  });

  it('every pose has two 1px eyes and four legs', () => {
    for (const [name, m] of Object.entries(POSES)) {
      const eyes = eyeBoxes(m);
      expect(eyes, name).toHaveLength(2);
      expect(eyes[0]!.w).toBe(1);
      expect(eyes[0]!.h).toBe(1);
      expect(legRuns(m), name).toHaveLength(4);
      expect(legRowCount(m), name).toBeGreaterThanOrEqual(1);
    }
  });

  it('idle legs are two rows, crawl legs one row', () => {
    expect(legRowCount(POSES.idle)).toBe(2);
    expect(legRowCount(POSES.crawl)).toBe(1);
  });
});

describe('stages', () => {
  it('pixel scale never shrinks', () => {
    for (let i = 1; i < STAGES.length; i++) expect(STAGES[i]!.pixel).toBeGreaterThanOrEqual(STAGES[i - 1]!.pixel);
  });

  it('each evolution unlocks a distinct outfit', () => {
    const unlocks = STAGES.map((s) => s.unlock).filter(Boolean);
    expect(new Set(unlocks).size).toBe(unlocks.length);
    expect(unlockedOutfits(0)).toEqual(['none']);
    expect(unlockedOutfits(STAGES.length - 1)).toHaveLength(unlocks.length + 1);
  });
});
