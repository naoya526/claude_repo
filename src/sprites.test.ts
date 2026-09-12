import { describe, expect, it } from 'vitest';
import { FOOD_SPRITES, STAGE_SPRITES, eyeBoxes, legRuns, validateMap } from './sprites';

describe('pixel maps', () => {
  it('stage sprites are rectangular and use known chars', () => {
    STAGE_SPRITES.forEach((m, i) => expect(validateMap(m), `stage ${i}`).toBeNull());
  });

  it('food sprites are rectangular and use known chars', () => {
    for (const [k, m] of Object.entries(FOOD_SPRITES)) expect(validateMap(m), k).toBeNull();
  });

  it('every stage has two eyes and four legs', () => {
    for (const m of STAGE_SPRITES) {
      const eyes = eyeBoxes(m);
      expect(eyes).toHaveLength(2);
      expect(eyes[0]!.w).toBe(eyes[1]!.w);
      expect(eyes[0]!.h).toBe(eyes[1]!.h);
      expect(legRuns(m)).toHaveLength(4);
    }
  });

  it('stages grow in size', () => {
    for (let i = 1; i < STAGE_SPRITES.length; i++) {
      expect(STAGE_SPRITES[i]![0]!.length).toBeGreaterThan(STAGE_SPRITES[i - 1]![0]!.length);
    }
  });
});
