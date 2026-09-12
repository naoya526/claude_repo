import { describe, expect, it } from 'vitest';
import { Pet, type World } from './pet';
import { LEVEL_UNLOCKS, STAGES, levelForXp, stageForXp } from './evolution';
import type { FoodKind, SaveData } from './types';
import { FOOD_KINDS } from './types';

const fed = () => Object.fromEntries(FOOD_KINDS.map((k) => [k, 0])) as Record<FoodKind, number>;

function petAt(xp: number): Pet {
  const save: SaveData = { version: 1, name: 'p', stats: { hunger: 60, energy: 90, happiness: 80, xp }, stage: 0, fed: fed(), pokes: 0, savedAt: Date.now() };
  const pet = new Pet(save, 0);
  pet.x = 400;
  pet.y = 400;
  pet.events.length = 0;
  return pet;
}

/** Drop one item on the pet's head and run the clock until everything settles. */
function feed(pet: Pet, kind: FoodKind, seconds = 20): void {
  const world: World = { now: 0, foods: [{ id: 1, kind, x: pet.x, y: pet.y, born: 0 }], cursor: null, cursorMovedAt: -Infinity, bounds: { w: 800, h: 600 } };
  for (let i = 0; i < seconds * 20; i++) {
    world.now += 50;
    pet.update(0.05, world);
  }
}

const unlocks = (pet: Pet) => pet.events.filter((e): e is Extract<typeof e, { type: 'unlocked' }> => e.type === 'unlocked');

describe('wardrobe unlocks', () => {
  it('hands over the stage outfit on every evolution, in order', () => {
    for (const [i, stage] of STAGES.entries()) {
      if (!stage.unlock) continue;
      const pet = petAt(stage.xp - 10);
      expect(pet.stage, stage.name).toBe(i - 1);
      feed(pet, 'commit');
      expect(pet.stage, stage.name).toBe(i);
      expect(unlocks(pet).map((e) => e.outfit), stage.name).toEqual([stage.unlock]);
      expect(unlocks(pet)[0]!.requirement).toBe(stage.name);
      expect(pet.outfit, stage.name).toBe(stage.unlock);
    }
  });

  it('starts bare as a Haiku', () => {
    const pet = petAt(0);
    expect(pet.def.name).toBe('Haiku');
    expect(pet.outfit).toBe('none');
    expect(pet.unlocked()).toEqual(['none']);
  });

  it('withholds the level outfits until the final form', () => {
    const final = STAGES[STAGES.length - 1]!;
    const pet = petAt(final.xp - 10);
    expect(pet.def.name).toBe('Opus');
    for (const u of LEVEL_UNLOCKS) expect(pet.unlocked()).not.toContain(u.outfit);
  });

  it('unlocks the rest by levelling up once final', () => {
    const first = LEVEL_UNLOCKS[0]!;
    const pet = petAt(5 * (first.level - 1) ** 2 - 20);
    expect(pet.stage).toBe(STAGES.length - 1);
    expect(pet.level).toBe(first.level - 1);
    feed(pet, 'commit');
    expect(pet.level).toBe(first.level);
    expect(unlocks(pet).map((e) => e.outfit)).toEqual([first.outfit]);
    expect(unlocks(pet)[0]!.requirement).toBe(`lv ${first.level}`);
  });

  it('does not re-announce outfits a reloaded save already owns', () => {
    const save: SaveData = { version: 1, name: 'p', stats: { hunger: 60, energy: 90, happiness: 80, xp: 3645 }, stage: 3, outfit: 'cape', fed: fed(), pokes: 0, savedAt: Date.now() };
    const pet = new Pet(save, 0);
    expect(pet.outfit).toBe('cape');
    expect(unlocks(pet)).toHaveLength(0);
  });

  it('refuses an outfit a tampered save has not earned, and derives the stage from xp', () => {
    const save: SaveData = { version: 1, name: 'p', stats: { hunger: 60, energy: 90, happiness: 80, xp: 100 }, stage: 3, outfit: 'cape', fed: fed(), pokes: 0, savedAt: Date.now() };
    const pet = new Pet(save, 0);
    expect(pet.stage).toBe(stageForXp(100));
    expect(pet.outfit).toBe('none');
    expect(pet.wear('cape')).toBe(false);
    expect(pet.wear('hardhat')).toBe(true);
  });

  it('levels up without evolving once past the final stage', () => {
    const final = STAGES[STAGES.length - 1]!;
    const pet = petAt(final.xp + 400);
    const before = pet.level;
    feed(pet, 'commit');
    expect(pet.stage).toBe(STAGES.length - 1);
    expect(pet.events.filter((e) => e.type === 'evolved')).toHaveLength(0);
    expect(levelForXp(pet.stats.xp)).toBeGreaterThanOrEqual(before);
  });
});
