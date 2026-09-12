import { describe, expect, it } from 'vitest';
import { FOOD_SPRITES, OUTFITS, OUTFIT_NAMES, POSES, eyeBoxes, legRowCount, legRuns, mapSize, validateMap } from './sprites';
import { FINAL_STAGE, LEVEL_UNLOCKS, STAGES, levelForXp, nextUnlock, stageUnlocks, unlockRequirement, unlockedOutfits, wardrobeSize, xpForLevel } from './evolution';

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
  const maxLevel = 999;

  it('gives every stage after the first exactly one outfit, in stage order', () => {
    expect(STAGES[0]!.unlock).toBeNull();
    const earned = stageUnlocks();
    expect(earned.map((u) => u.stage)).toEqual([1, 2, 3]);
    expect(earned.map((u) => u.outfit)).toEqual(['hardhat', 'wizard', 'party']);
  });

  it('covers every outfit exactly once across the two routes', () => {
    const names = [...stageUnlocks().map((u) => u.outfit), ...LEVEL_UNLOCKS.map((u) => u.outfit)];
    expect(new Set(names).size).toBe(names.length);
    expect(names).not.toContain('none');
    expect(names.length).toBe(OUTFIT_NAMES.length - 1);
    expect(wardrobeSize()).toBe(OUTFIT_NAMES.length);
  });

  it('unlock levels ascend and all sit above the final evolution', () => {
    const finalLevel = levelForXp(STAGES[FINAL_STAGE]!.xp);
    for (let i = 0; i < LEVEL_UNLOCKS.length; i++) {
      expect(LEVEL_UNLOCKS[i]!.level, LEVEL_UNLOCKS[i]!.outfit).toBeGreaterThan(finalLevel);
      if (i > 0) expect(LEVEL_UNLOCKS[i]!.level).toBeGreaterThan(LEVEL_UNLOCKS[i - 1]!.level);
    }
  });

  it('follows the stage ladder before the final form', () => {
    expect(unlockedOutfits(0, maxLevel)).toEqual(['none']);
    expect(unlockedOutfits(1, maxLevel)).toEqual(['none', 'hardhat']);
    expect(unlockedOutfits(2, maxLevel)).toEqual(['none', 'hardhat', 'wizard']);
  });

  it('withholds every level outfit until the pet reaches the final form', () => {
    for (let stage = 0; stage < FINAL_STAGE; stage++) {
      const list = unlockedOutfits(stage, maxLevel);
      for (const u of LEVEL_UNLOCKS) expect(list, `stage ${stage}`).not.toContain(u.outfit);
    }
    expect(unlockedOutfits(FINAL_STAGE, maxLevel)).toHaveLength(wardrobeSize());
  });

  it('hands out level outfits one at a time once final', () => {
    const first = LEVEL_UNLOCKS[0]!;
    expect(unlockedOutfits(FINAL_STAGE, first.level - 1)).toEqual(['none', 'hardhat', 'wizard', 'party']);
    expect(unlockedOutfits(FINAL_STAGE, first.level)).toContain(first.outfit);
  });

  it('points at the next thing to earn, by evolution then by level', () => {
    expect(nextUnlock(0, 1)).toEqual({ outfit: 'hardhat', requirement: 'Sonnet' });
    expect(nextUnlock(2, 1)).toEqual({ outfit: 'party', requirement: STAGES[FINAL_STAGE]!.name });
    const first = LEVEL_UNLOCKS[0]!;
    expect(nextUnlock(FINAL_STAGE, 1)).toEqual({ outfit: first.outfit, requirement: `lv ${first.level}` });
    expect(nextUnlock(FINAL_STAGE, maxLevel)).toBeNull();
  });

  it('describes how each outfit is earned', () => {
    expect(unlockRequirement('hardhat')).toBe('Sonnet');
    expect(unlockRequirement('party')).toBe(STAGES[FINAL_STAGE]!.name);
    expect(unlockRequirement('cape')).toBe(`lv ${LEVEL_UNLOCKS[LEVEL_UNLOCKS.length - 1]!.level}`);
  });

  it('xpForLevel and levelForXp agree', () => {
    for (let l = 1; l < 40; l++) {
      expect(levelForXp(xpForLevel(l))).toBe(l);
      expect(levelForXp(xpForLevel(l) - 1)).toBe(Math.max(1, l - 1));
    }
  });
});
