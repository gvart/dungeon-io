import { describe, expect, it } from 'vitest';
import {
  CLEAR_COST,
  levelUpCost,
  STARTING_RESOURCES,
  STRONGHOLD_ID,
  STRUCTURES,
} from '../data/structures';
import {
  canPlace,
  clearObstacle,
  createInitialFortress,
  type FortressState,
  getCell,
  hasStructure,
  indexOf,
  levelUp,
  placeStructure,
  removeStructure,
} from './grid';
import { type TerrainType } from './terrain';

/** All-grass terrain for a state's dimensions. */
function grass(state: FortressState): TerrainType[] {
  return new Array<TerrainType>(state.cols * state.rows).fill('grass');
}

describe('createInitialFortress', () => {
  it('starts empty with full resources, level 1, and a seed', () => {
    const s = createInitialFortress(42);
    expect(s.resources).toBe(STARTING_RESOURCES);
    expect(s.level).toBe(1);
    expect(s.seed).toBe(42);
    expect(s.cleared).toEqual([]);
    expect(s.cells.filter((c) => c !== null)).toHaveLength(0);
  });
});

describe('canPlace / placeStructure', () => {
  it('places the stronghold on open ground and deducts cost', () => {
    const s = createInitialFortress(1);
    const t = grass(s);
    expect(placeStructure(s, t, 2, 2, STRONGHOLD_ID)).toBe(true);
    expect(getCell(s, 2, 2)).toEqual({ structureId: STRONGHOLD_ID });
    expect(s.resources).toBe(STARTING_RESOURCES - STRUCTURES[STRONGHOLD_ID].cost);
  });

  it('allows only one unique stronghold', () => {
    const s = createInitialFortress(1);
    const t = grass(s);
    placeStructure(s, t, 2, 2, STRONGHOLD_ID);
    expect(hasStructure(s, STRONGHOLD_ID)).toBe(true);
    expect(canPlace(s, t, 4, 4, STRONGHOLD_ID)).toBe(false);
  });

  it('gates higher-tier structures behind level', () => {
    const s = createInitialFortress(1);
    const t = grass(s);
    expect(canPlace(s, t, 1, 1, 'tower')).toBe(false); // tower needs level 2
    s.level = 2;
    expect(canPlace(s, t, 1, 1, 'tower')).toBe(true);
  });

  it('rejects out-of-bounds, occupied, unaffordable, and unknown', () => {
    const s = createInitialFortress(1);
    const t = grass(s);
    expect(canPlace(s, t, -1, 0, 'wall')).toBe(false);
    expect(canPlace(s, t, s.cols, 0, 'wall')).toBe(false);
    placeStructure(s, t, 0, 0, 'wall');
    expect(canPlace(s, t, 0, 0, 'gate')).toBe(false);
    s.resources = 0;
    expect(canPlace(s, t, 1, 1, 'wall')).toBe(false);
    expect(canPlace(s, t, 1, 1, 'nope')).toBe(false);
  });

  it('blocks building on obstacles and water', () => {
    const s = createInitialFortress(1);
    const t = grass(s);
    t[indexOf(s, 1, 1)] = 'tree';
    t[indexOf(s, 2, 2)] = 'water';
    expect(canPlace(s, t, 1, 1, 'wall')).toBe(false);
    expect(canPlace(s, t, 2, 2, 'wall')).toBe(false);
  });
});

describe('clearObstacle', () => {
  it('clears a tree/rock for a cost and opens the cell for building', () => {
    const s = createInitialFortress(1);
    const t = grass(s);
    t[indexOf(s, 3, 3)] = 'tree';
    expect(canPlace(s, t, 3, 3, 'wall')).toBe(false);
    expect(clearObstacle(s, t, 3, 3)).toBe(true);
    expect(s.resources).toBe(STARTING_RESOURCES - CLEAR_COST);
    expect(canPlace(s, t, 3, 3, 'wall')).toBe(true);
  });

  it('never clears water or open ground', () => {
    const s = createInitialFortress(1);
    const t = grass(s);
    t[indexOf(s, 1, 1)] = 'water';
    expect(clearObstacle(s, t, 1, 1)).toBe(false);
    expect(clearObstacle(s, t, 5, 5)).toBe(false); // grass
  });
});

describe('removeStructure', () => {
  it('refunds removable structures', () => {
    const s = createInitialFortress(1);
    const t = grass(s);
    placeStructure(s, t, 2, 2, 'gate');
    expect(removeStructure(s, 2, 2)).toBe(true);
    expect(getCell(s, 2, 2)).toBeNull();
    expect(s.resources).toBe(STARTING_RESOURCES);
  });

  it('never removes the indestructible stronghold', () => {
    const s = createInitialFortress(1);
    const t = grass(s);
    placeStructure(s, t, 2, 2, STRONGHOLD_ID);
    expect(removeStructure(s, 2, 2)).toBe(false);
    expect(getCell(s, 2, 2)).toEqual({ structureId: STRONGHOLD_ID });
  });
});

describe('levelUp', () => {
  it('spends resources and raises the level', () => {
    const s = createInitialFortress(1);
    const cost = levelUpCost(s.level);
    expect(levelUp(s)).toBe(true);
    expect(s.level).toBe(2);
    expect(s.resources).toBe(STARTING_RESOURCES - cost);
  });

  it('fails when resources are insufficient', () => {
    const s = createInitialFortress(1);
    s.resources = 0;
    expect(levelUp(s)).toBe(false);
    expect(s.level).toBe(1);
  });
});
