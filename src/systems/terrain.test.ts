import { describe, expect, it } from 'vitest';
import {
  generateTerrain,
  isBuildable,
  isClearable,
  MAP_COLS,
  MAP_ROWS,
  terrainAt,
  type TerrainType,
} from './terrain';

describe('generateTerrain', () => {
  it('is deterministic for a given seed', () => {
    const a = generateTerrain(2024);
    const b = generateTerrain(2024);
    expect(a).toEqual(b);
  });

  it('differs across seeds', () => {
    const a = generateTerrain(1);
    const b = generateTerrain(2);
    expect(a).not.toEqual(b);
  });

  it('fills exactly cols*rows cells with valid terrain types', () => {
    const t = generateTerrain(5);
    expect(t).toHaveLength(MAP_COLS * MAP_ROWS);
    const valid = new Set<TerrainType>(['grass', 'road', 'tree', 'rock', 'water']);
    expect(t.every((cell) => valid.has(cell))).toBe(true);
  });

  it('leaves most of the map as buildable ground', () => {
    const t = generateTerrain(123);
    const buildable = t.filter(isBuildable).length;
    expect(buildable).toBeGreaterThan(t.length / 2);
  });
});

describe('classification', () => {
  it('marks grass/road buildable and tree/rock clearable; water neither', () => {
    expect(isBuildable('grass')).toBe(true);
    expect(isBuildable('road')).toBe(true);
    expect(isBuildable('tree')).toBe(false);
    expect(isClearable('tree')).toBe(true);
    expect(isClearable('rock')).toBe(true);
    expect(isClearable('water')).toBe(false);
    expect(isBuildable('water')).toBe(false);
  });
});

describe('terrainAt', () => {
  it('reads by col/row and defaults to grass out of range', () => {
    const t = generateTerrain(8);
    expect(t.includes(terrainAt(t, MAP_COLS, 0, 0))).toBe(true);
    expect(terrainAt(t, MAP_COLS, 999, 999)).toBe('grass');
  });
});
