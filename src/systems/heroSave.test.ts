import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { baselineAttributes, makePlayerHero, type Hero } from './hero';
import { createRecruitState, type RecruitState } from './recruit';
import { type GatherNode } from './task';
import {
  clearHeroSave,
  deserializeHeroes,
  HERO_SAVE_KEY,
  type HeroWorld,
  loadHeroes,
  loadOrCreateHeroWorld,
  saveHeroes,
  serializeHeroes,
} from './heroSave';

class LocalStorageStub {
  private store = new Map<string, string>();
  getItem(k: string): string | null {
    return this.store.has(k) ? this.store.get(k)! : null;
  }
  setItem(k: string, v: string): void {
    this.store.set(k, v);
  }
  removeItem(k: string): void {
    this.store.delete(k);
  }
}

beforeEach(() => {
  (globalThis as unknown as { localStorage: LocalStorageStub }).localStorage =
    new LocalStorageStub();
});

afterEach(() => {
  clearHeroSave();
});

function sampleWorld(): HeroWorld {
  const h1: Hero = makePlayerHero('a', 'Aldric', baselineAttributes(), 3, 4);
  h1.skills = ['tough'];
  h1.equipment.weapon = 'iron-sword';
  h1.level = 5;
  h1.stars = 1;
  h1.task = { kind: 'gather', targetCol: 6, targetRow: 6, progress: 0.4 };

  const h2: Hero = makePlayerHero('b', 'Bryn', baselineAttributes(), 1, 1); // idle

  const recruit: RecruitState = createRecruitState(99);
  recruit.counter = 2;
  recruit.nextArrivalMs = 90_000;

  const nodes: GatherNode[] = [{ col: 6, row: 6, remaining: 4 }];
  return { heroes: [h1, h2], recruit, nodes };
}

describe('serialize / deserialize', () => {
  it('round-trips roster, gear, skills, recruit, and nodes', () => {
    const world = sampleWorld();
    const back = deserializeHeroes(serializeHeroes(world));
    expect(back).not.toBeNull();
    expect(back!.heroes).toHaveLength(2);
    const a = back!.heroes[0];
    expect(a.name).toBe('Aldric');
    expect(a.skills).toEqual(['tough']);
    expect(a.equipment.weapon).toBe('iron-sword');
    expect(a.level).toBe(5);
    expect(a.stars).toBe(1);
    expect(back!.recruit.counter).toBe(2);
    expect(back!.recruit.nextArrivalMs).toBe(90_000);
    expect(back!.nodes).toEqual([{ col: 6, row: 6, remaining: 4 }]);
  });

  it('omits idle tasks and preserves non-idle ones (path not stored)', () => {
    const world = sampleWorld();
    const back = deserializeHeroes(serializeHeroes(world))!;
    expect(back.heroes[1].task.kind).toBe('idle');
    expect(back.heroes[0].task.kind).toBe('gather');
    expect(back.heroes[0].task.targetCol).toBe(6);
    expect(back.heroes[0].task.path).toBeUndefined();
  });

  it('round-trips a pending arrival', () => {
    const world = sampleWorld();
    world.recruit.pending = {
      id: 'arr-2',
      hero: makePlayerHero('arr-2', 'Cael', baselineAttributes(), 0, 0),
      expiresAtMs: 120_000,
    };
    const back = deserializeHeroes(serializeHeroes(world))!;
    expect(back.recruit.pending).not.toBeNull();
    expect(back.recruit.pending!.hero.name).toBe('Cael');
    expect(back.recruit.pending!.expiresAtMs).toBe(120_000);
  });

  it('rejects malformed / wrong-version data', () => {
    expect(deserializeHeroes(null)).toBeNull();
    expect(deserializeHeroes({ v: 99, heroes: [] })).toBeNull();
    expect(
      deserializeHeroes({ v: 1, heroes: [{ id: 'x' }], recruit: [0, 0, 0], nodes: [] })
    ).toBeNull();
  });
});

describe('saveHeroes / loadHeroes', () => {
  it('persists and restores via localStorage', () => {
    saveHeroes(sampleWorld());
    const loaded = loadHeroes();
    expect(loaded).not.toBeNull();
    expect(loaded!.heroes).toHaveLength(2);
  });

  it('clears and returns null on corrupt JSON', () => {
    localStorage.setItem(HERO_SAVE_KEY, '{ not json');
    expect(loadHeroes()).toBeNull();
    expect(localStorage.getItem(HERO_SAVE_KEY)).toBeNull();
  });

  it('loadOrCreateHeroWorld falls back to a starter roster', () => {
    const world = loadOrCreateHeroWorld(7);
    expect(world.heroes).toHaveLength(3);
    expect(world.nodes).toEqual([]);
  });
});
