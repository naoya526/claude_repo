import { describe, expect, it } from 'vitest';
import { FOOD_SPRITES, OUTFITS, OUTFIT_NAMES, POSES, eyeBoxes, legRowCount, legRuns, mapSize, validateMap } from './sprites';
import { STAGES, UNLOCKS, levelForXp, unlockedOutfits, unlocksBetween, nextUnlock, xpForLevel } from './evolution';

describe('pixel maps', () => {
  it('pose sprites are rectangular, use known chars and share one canvas', () => {
    const base = mapSize(POSES.idle);
    for (const [name, m] of Object.entries(POSES)) {
      expect(validateMap(m), name).toBeNull();
      expect(mapSize(m), name).toEqual(base);
    }
  });

  it('food sprites are valid', () => {
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

  it('every outfit name has a definition and vice versa', () => {
    expect(new Set(OUTFIT_NAMES).size).toBe(OUTFIT_NAMES.length);
    expect(Object.keys(OUTFITS).sort()).toEqual([...OUTFIT_NAMES].sort());
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

  it('idle legs are two rows, crawl one row', () => {
    expect(legRowCount(POSES.idle)).toBe(2);
    expect(legRowCount(POSES.crawl)).toBe(1);
  });
});

describe('stages', () => {
  it('pixel scale never shrinks', () => {
    for (let i = 1; i < STAGES.length; i++) expect(STAGES[i]!.pixel).toBeGreaterThanOrEqual(STAGES[i - 1]!.pixel);
  });
});

describe('wardrobe', () => {
  it('unlock levels ascend and every outfit is reachable exactly once', () => {
    for (let i = 1; i < UNLOCKS.length; i++) expect(UNLOCKS[i]!.level).toBeGreaterThan(UNLOCKS[i - 1]!.level);
    const names = UNLOCKS.map((u) => u.outfit);
    expect(new Set(names).size).toBe(names.length);
    expect(names).not.toContain('none');
    expect(names.length).toBe(OUTFIT_NAMES.length - 1);
  });

  it('grows from just "none" to the full wardrobe', () => {
    expect(unlockedOutfits(1)).toEqual(['none']);
    expect(unlockedOutfits(999)).toHaveLength(UNLOCKS.length + 1);
  });

  it('outfits are cosmetic only — every layer is a valid overlay', () => {
    const total = Object.values(OUTFITS).reduce((n, o) => n + o.layers.length, 0);
    expect(total).toBeGreaterThan(OUTFIT_NAMES.length - 1);
  });

  it('keeps unlocking well past the last evolution', () => {
    const mythosLevel = levelForXp(STAGES[STAGES.length - 1]!.xp);
    const later = UNLOCKS.filter((u) => u.level > mythosLevel);
    expect(later.length).toBeGreaterThanOrEqual(5);
    expect(nextUnlock(mythosLevel)?.outfit).toBe(later[0]!.outfit);
    expect(nextUnlock(999)).toBeNull();
  });

  it('reports exactly the outfits earned by a jump in level', () => {
    const first = UNLOCKS[0]!;
    const second = UNLOCKS[1]!;
    expect(unlocksBetween(1, first.level).map((u) => u.outfit)).toEqual([first.outfit]);
    expect(unlocksBetween(first.level, second.level).map((u) => u.outfit)).toEqual([second.outfit]);
    expect(unlocksBetween(5, 5)).toEqual([]);
  });

  it('xpForLevel and levelForXp agree', () => {
    for (let l = 1; l < 40; l++) {
      expect(levelForXp(xpForLevel(l))).toBe(l);
      expect(levelForXp(xpForLevel(l) - 1)).toBe(Math.max(1, l - 1));
    }
  });
});
