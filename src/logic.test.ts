import { describe, expect, it } from 'vitest';
import { applyFood, decay, moodFromStats, offlineDecay, DEFAULT_STATS } from './logic';
import { STAGES, levelForXp, stageForXp } from './evolution';
import { FOOD_KINDS } from './types';

describe('applyFood', () => {
  it('adds the food effects and xp', () => {
    const { stats, overfed } = applyFood({ hunger: 50, energy: 50, happiness: 50, xp: 0 }, 'token');
    expect(overfed).toBe(false);
    expect(stats.hunger).toBe(72);
    expect(stats.xp).toBe(10);
  });

  it('clamps stats to 0..100', () => {
    const { stats } = applyFood({ hunger: 90, energy: 99, happiness: 100, xp: 0 }, 'coffee');
    expect(stats.energy).toBe(100);
    expect(stats.happiness).toBe(100);
  });

  it('penalises overfeeding', () => {
    const { stats, overfed } = applyFood({ hunger: 95, energy: 50, happiness: 50, xp: 0 }, 'commit');
    expect(overfed).toBe(true);
    expect(stats.happiness).toBe(44);
    expect(stats.xp).toBe(15);
  });

  it('every food gives positive xp', () => {
    for (const k of FOOD_KINDS) expect(applyFood(DEFAULT_STATS, k).stats.xp).toBeGreaterThan(0);
  });
});

describe('decay', () => {
  it('drains stats while awake', () => {
    const s = decay({ hunger: 50, energy: 50, happiness: 50, xp: 0 }, 10, false);
    expect(s.hunger).toBeLessThan(50);
    expect(s.energy).toBeLessThan(50);
    expect(s.happiness).toBeLessThan(50);
  });

  it('restores energy while sleeping', () => {
    const s = decay({ hunger: 50, energy: 50, happiness: 50, xp: 0 }, 10, true);
    expect(s.energy).toBeGreaterThan(50);
    expect(s.happiness).toBe(50);
  });

  it('gets properly hungry while away, but floors out instead of dying', () => {
    const hour = 1000 * 60 * 60;
    expect(offlineDecay(DEFAULT_STATS, hour).hunger).toBeLessThan(DEFAULT_STATS.hunger - 30);
    const s = offlineDecay({ hunger: 100, energy: 10, happiness: 100, xp: 0 }, hour * 24 * 7);
    expect(s.hunger).toBeGreaterThanOrEqual(8);
    expect(s.happiness).toBeGreaterThanOrEqual(20);
    expect(s.energy).toBe(100);
  });

  it('empties a full belly in a few minutes of play', () => {
    const minutes = (n: number) => decay({ hunger: 100, energy: 100, happiness: 100, xp: 0 }, n * 60, false).hunger;
    expect(minutes(2)).toBeGreaterThan(0);
    expect(minutes(10)).toBe(0);
  });
});

describe('evolution', () => {
  it('stage thresholds are ascending and start at 0', () => {
    expect(STAGES[0]?.xp).toBe(0);
    for (let i = 1; i < STAGES.length; i++) expect(STAGES[i]!.xp).toBeGreaterThan(STAGES[i - 1]!.xp);
  });

  it('levels keep climbing past the final stage', () => {
    const last = STAGES[STAGES.length - 1]!;
    expect(last.name).toBe('Fable');
    expect(stageForXp(last.xp * 10)).toBe(STAGES.length - 1);
    expect(levelForXp(last.xp * 10)).toBeGreaterThan(levelForXp(last.xp));
  });

  it('every stage after the first grants one outfit', () => {
    expect(STAGES.filter((s) => s.unlock).length).toBe(STAGES.length - 1);
  });

  it('maps xp to stage', () => {
    expect(stageForXp(0)).toBe(0);
    expect(stageForXp(STAGES[1]!.xp)).toBe(1);
    expect(stageForXp(STAGES[1]!.xp - 1)).toBe(0);
    expect(stageForXp(10_000)).toBe(STAGES.length - 1);
  });

  it('level grows monotonically', () => {
    let prev = 0;
    for (let xp = 0; xp < 500; xp += 7) {
      const l = levelForXp(xp);
      expect(l).toBeGreaterThanOrEqual(prev);
      prev = l;
    }
  });
});

describe('moodFromStats', () => {
  it('is sad when starving', () => expect(moodFromStats({ hunger: 5, energy: 80, happiness: 80, xp: 0 })).toBe('sad'));
  it('is happy when content', () => expect(moodFromStats({ hunger: 80, energy: 80, happiness: 90, xp: 0 })).toBe('happy'));
});
