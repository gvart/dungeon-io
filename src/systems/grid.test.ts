import { describe, expect, it } from 'vitest';
import { CENTER_ID, STARTING_RESOURCES, STRUCTURES } from '../data/structures';
import {
  canPlace,
  centerCol,
  centerRow,
  createInitialFortress,
  getCell,
  isCenterCell,
  placeStructure,
  removeStructure,
} from './grid';

describe('createInitialFortress', () => {
  it('places the capture center at the middle with full resources', () => {
    const s = createInitialFortress();
    expect(s.resources).toBe(STARTING_RESOURCES);
    const center = getCell(s, centerCol(s.cols), centerRow(s.rows));
    expect(center).toEqual({ structureId: CENTER_ID });
    expect(isCenterCell(s, centerCol(s.cols), centerRow(s.rows))).toBe(true);
  });

  it('starts otherwise empty', () => {
    const s = createInitialFortress();
    const occupied = s.cells.filter((c) => c !== null);
    expect(occupied).toHaveLength(1);
  });
});

describe('canPlace', () => {
  it('rejects out-of-bounds, the center cell, and occupied cells', () => {
    const s = createInitialFortress();
    expect(canPlace(s, -1, 0, 'wall')).toBe(false);
    expect(canPlace(s, s.cols, 0, 'wall')).toBe(false);
    expect(canPlace(s, centerCol(s.cols), centerRow(s.rows), 'wall')).toBe(false);
    placeStructure(s, 0, 0, 'wall');
    expect(canPlace(s, 0, 0, 'gate')).toBe(false);
  });

  it('rejects unaffordable and unknown structures', () => {
    const s = createInitialFortress();
    s.resources = 0;
    expect(canPlace(s, 0, 0, 'tower')).toBe(false);
    expect(canPlace(s, 0, 0, 'nope')).toBe(false);
    expect(canPlace(s, 0, 0, CENTER_ID)).toBe(false);
  });
});

describe('placeStructure', () => {
  it('occupies the cell and deducts the cost', () => {
    const s = createInitialFortress();
    const ok = placeStructure(s, 0, 0, 'tower');
    expect(ok).toBe(true);
    expect(getCell(s, 0, 0)).toEqual({ structureId: 'tower' });
    expect(s.resources).toBe(STARTING_RESOURCES - STRUCTURES.tower.cost);
  });

  it('fails without changing state when placement is invalid', () => {
    const s = createInitialFortress();
    placeStructure(s, 1, 1, 'wall');
    const before = s.resources;
    expect(placeStructure(s, 1, 1, 'wall')).toBe(false);
    expect(s.resources).toBe(before);
  });
});

describe('removeStructure', () => {
  it('frees the cell and refunds the cost', () => {
    const s = createInitialFortress();
    placeStructure(s, 2, 2, 'gate');
    const ok = removeStructure(s, 2, 2);
    expect(ok).toBe(true);
    expect(getCell(s, 2, 2)).toBeNull();
    expect(s.resources).toBe(STARTING_RESOURCES);
  });

  it('never removes the capture center', () => {
    const s = createInitialFortress();
    const ok = removeStructure(s, centerCol(s.cols), centerRow(s.rows));
    expect(ok).toBe(false);
    expect(getCell(s, centerCol(s.cols), centerRow(s.rows))).toEqual({ structureId: CENTER_ID });
  });

  it('does nothing on an empty cell', () => {
    const s = createInitialFortress();
    expect(removeStructure(s, 0, 0)).toBe(false);
    expect(s.resources).toBe(STARTING_RESOURCES);
  });
});
