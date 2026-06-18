import { describe, expect, it } from 'vitest';
import { createInitialFortress, placeStructure } from './grid';
import { type TerrainType } from './terrain';
import {
  acceptArrival,
  ARRIVAL_INTERVAL_MS,
  ARRIVAL_VISIBLE_MS,
  createRecruitState,
  fortressQuality,
  rejectArrival,
  tickRecruit,
} from './recruit';

function grass(cols: number, rows: number): TerrainType[] {
  return new Array<TerrainType>(cols * rows).fill('grass');
}

describe('fortressQuality', () => {
  it('rises with level and structure count', () => {
    const bare = createInitialFortress(1);
    const developed = createInitialFortress(1);
    const t = grass(developed.cols, developed.rows);
    developed.level = 3;
    for (let i = 0; i < 8; i++) placeStructure(developed, t, i, 0, 'wall');
    expect(fortressQuality(developed)).toBeGreaterThan(fortressQuality(bare));
  });
});

describe('tickRecruit', () => {
  it('produces no arrival before the interval, then one after', () => {
    const s = createInitialFortress(1);
    const rs = createRecruitState(42);
    tickRecruit(rs, s, ARRIVAL_INTERVAL_MS - 1);
    expect(rs.pending).toBeNull();
    tickRecruit(rs, s, ARRIVAL_INTERVAL_MS);
    expect(rs.pending).not.toBeNull();
    expect(rs.counter).toBe(1);
  });

  it('reproduces the same candidate from the same seed + counter', () => {
    const s = createInitialFortress(1);
    const a = createRecruitState(42);
    const b = createRecruitState(42);
    tickRecruit(a, s, ARRIVAL_INTERVAL_MS);
    tickRecruit(b, s, ARRIVAL_INTERVAL_MS);
    expect(a.pending!.hero).toEqual(b.pending!.hero);
  });

  it('expires an ignored candidate', () => {
    const s = createInitialFortress(1);
    const rs = createRecruitState(42);
    tickRecruit(rs, s, ARRIVAL_INTERVAL_MS);
    expect(rs.pending).not.toBeNull();
    tickRecruit(rs, s, ARRIVAL_INTERVAL_MS + ARRIVAL_VISIBLE_MS + 1);
    expect(rs.pending).toBeNull();
  });
});

describe('accept / reject', () => {
  it('accept returns the hero and clears pending', () => {
    const s = createInitialFortress(1);
    const rs = createRecruitState(42);
    tickRecruit(rs, s, ARRIVAL_INTERVAL_MS);
    const hero = acceptArrival(rs);
    expect(hero).not.toBeNull();
    expect(rs.pending).toBeNull();
  });

  it('reject clears pending without returning a hero', () => {
    const s = createInitialFortress(1);
    const rs = createRecruitState(42);
    tickRecruit(rs, s, ARRIVAL_INTERVAL_MS);
    rejectArrival(rs);
    expect(rs.pending).toBeNull();
  });
});
