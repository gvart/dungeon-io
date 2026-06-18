import { describe, expect, it } from 'vitest';
import {
  ATTR_BASELINE,
  ATTR_MAX,
  ATTR_POINTS_START,
  deriveStats,
  type Attributes,
} from '../data/attributes';
import {
  allocateAttributes,
  baselineAttributes,
  canPromote,
  createStarterRoster,
  expForLevel,
  generateHero,
  grantExp,
  HERO_MAX_LEVEL,
  heroStats,
  makePlayerHero,
  MAX_STARS,
  pointsSpent,
  promote,
} from './hero';

const ATTR: Attributes = { str: 5, agi: 6, int: 4, vit: 7 };

describe('deriveStats', () => {
  it('computes derived stats from attributes and level', () => {
    const s = deriveStats(ATTR, 1);
    expect(s.hp).toBeCloseTo(20 + 7 * 8);
    expect(s.attack).toBeCloseTo(2 + 5 * 1.5 + 6 * 0.5);
    expect(s.critPct).toBeCloseTo(2 + 6 * 0.8);
    expect(s.moveSpeed).toBeCloseTo(1.6 + 6 * 0.06);
  });

  it('adds a flat bonus and clamps crit', () => {
    const s = deriveStats(ATTR, 1, { hp: 10, critPct: 100 });
    expect(s.hp).toBeCloseTo(20 + 7 * 8 + 10);
    expect(s.critPct).toBe(75);
  });
});

describe('allocateAttributes / pointsSpent', () => {
  it('accepts a valid in-budget allocation', () => {
    const attr = baselineAttributes();
    attr.str += 3;
    attr.vit += 2;
    expect(pointsSpent(attr)).toBe(5);
    expect(allocateAttributes(attr)).toEqual(attr);
  });

  it('rejects over-budget and out-of-range allocations', () => {
    const over = baselineAttributes();
    over.str += ATTR_POINTS_START + 1;
    expect(allocateAttributes(over)).toBeNull();

    const tooLow = baselineAttributes();
    tooLow.int = 0;
    expect(allocateAttributes(tooLow)).toBeNull();

    const fractional = { ...baselineAttributes(), agi: 5.5 };
    expect(allocateAttributes(fractional)).toBeNull();
  });
});

describe('leveling', () => {
  it('grants exp and levels up across thresholds', () => {
    const h = makePlayerHero('h1', 'Test', baselineAttributes());
    expect(grantExp(h, expForLevel(1))).toBe(true);
    expect(h.level).toBe(2);
    expect(h.exp).toBe(0);
  });

  it('caps at HERO_MAX_LEVEL', () => {
    const h = makePlayerHero('h1', 'Test', baselineAttributes());
    grantExp(h, 1_000_000);
    expect(h.level).toBe(HERO_MAX_LEVEL);
  });
});

describe('promotion', () => {
  it('only promotes at level cap and increments stars', () => {
    const h = makePlayerHero('h1', 'Test', baselineAttributes());
    expect(canPromote(h)).toBe(false);
    expect(promote(h)).toBe(false);
    h.level = HERO_MAX_LEVEL;
    expect(canPromote(h)).toBe(true);
    expect(promote(h)).toBe(true);
    expect(h.stars).toBe(1);
    expect(h.level).toBe(1);
  });

  it('caps at MAX_STARS', () => {
    const h = makePlayerHero('h1', 'Test', baselineAttributes());
    for (let i = 0; i < MAX_STARS + 2; i++) {
      h.level = HERO_MAX_LEVEL;
      promote(h);
    }
    expect(h.stars).toBe(MAX_STARS);
  });
});

describe('heroStats with stars/gear/skills', () => {
  it('scales hp and attack with stars', () => {
    const h = makePlayerHero('h1', 'Test', ATTR);
    const base = heroStats(h);
    h.stars = 2;
    const promoted = heroStats(h);
    expect(promoted.hp).toBeCloseTo(base.hp * 1.2);
    expect(promoted.attack).toBeCloseTo(base.attack * 1.2);
  });

  it('folds gear and skill mods into derived stats', () => {
    const h = makePlayerHero('h1', 'Test', ATTR);
    const base = heroStats(h);
    h.equipment.weapon = 'iron-sword'; // +6 attack
    h.skills = ['tough']; // +25 hp
    const buffed = heroStats(h);
    expect(buffed.attack).toBeCloseTo(base.attack + 6);
    expect(buffed.hp).toBeCloseTo(base.hp + 25);
  });
});

describe('generateHero', () => {
  it('is deterministic for the same seed and quality', () => {
    const a = generateHero(12345, 0.5);
    const b = generateHero(12345, 0.5);
    expect(a).toEqual(b);
  });

  it('produces stronger heroes at higher quality on average', () => {
    let lowTotal = 0;
    let highTotal = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const low = generateHero(seed, 0.1);
      const high = generateHero(seed, 0.95);
      lowTotal += pointsSpent(low.attributes);
      highTotal += pointsSpent(high.attributes);
    }
    expect(highTotal).toBeGreaterThan(lowTotal);
  });

  it('keeps attributes within per-attribute bounds', () => {
    // Recruits may exceed the player's build budget (that's the point), but each
    // attribute still stays within [ATTR_BASELINE, ATTR_MAX].
    const h = generateHero(777, 1);
    for (const k of ['str', 'agi', 'int', 'vit'] as const) {
      expect(h.attributes[k]).toBeGreaterThanOrEqual(ATTR_BASELINE);
      expect(h.attributes[k]).toBeLessThanOrEqual(ATTR_MAX);
    }
  });
});

describe('createStarterRoster', () => {
  it('is deterministic and produces three heroes', () => {
    const a = createStarterRoster(42);
    const b = createStarterRoster(42);
    expect(a).toHaveLength(3);
    expect(a).toEqual(b);
    expect(new Set(a.map((h) => h.id)).size).toBe(3);
  });
});
