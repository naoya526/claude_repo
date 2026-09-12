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

  it('never zeroes everything after a long absence', () => {
    const s = offlineDecay({ hunger: 100, energy: 10, happiness: 100, xp: 0 }, 1000 * 60 * 60 * 24 * 7);
    expect(s.hunger).toBeGreaterThan(30);
    expect(s.happiness).toBeGreaterThan(50);
    expect(s.energy).toBe(100);
  });
});

describe('evolution', () => {
  it('stage thresholds are ascending and start at 0', () => {
    expect(STAGES[0]?.xp).toBe(0);
    for (let i = 1; i < STAGES.length; i++) expect(STAGES[i]!.xp).toBeGreaterThan(STAGES[i - 1]!.xp);
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
