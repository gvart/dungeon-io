import { describe, expect, it } from 'vitest';
import {
  generateTerrain,
  isBuildable,
  isClearable,
  MAP_COLS,
  MAP_ROWS,
  roadMask,
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

describe('roadMask', () => {
  // 3x3 grid; G=grass, R=road. roadMask reports connected N,E,S,W road neighbors.
  const cols = 3;
  const build = (cells: TerrainType[]): TerrainType[] => cells;
  const G: TerrainType = 'grass';
  const R: TerrainType = 'road';

  it('reports neighbors in canonical N,E,S,W order', () => {
    // center road with N, E, S, W all road -> cross
    const cross = build([G, R, G, R, R, R, G, R, G]);
    expect(roadMask(cross, cols, 1, 1)).toBe('NESW');
  });

  it('returns a straight key for two opposite neighbors', () => {
    const vertical = build([G, R, G, G, R, G, G, R, G]);
    expect(roadMask(vertical, cols, 1, 1)).toBe('NS');
    const horizontal = build([G, G, G, R, R, R, G, G, G]);
    expect(roadMask(horizontal, cols, 1, 1)).toBe('EW');
  });

  it('returns a corner key for two perpendicular neighbors', () => {
    // road to the N and E of center -> corner NE
    const ne = build([G, R, G, G, R, R, G, G, G]);
    expect(roadMask(ne, cols, 1, 1)).toBe('NE');
  });

  it('returns a single direction (end cap) and empty (isolated)', () => {
    const endS = build([G, G, G, G, R, G, G, R, G]);
    expect(roadMask(endS, cols, 1, 1)).toBe('S');
    const isolated = build([G, G, G, G, R, G, G, G, G]);
    expect(roadMask(isolated, cols, 1, 1)).toBe('');
  });
});

describe('road connectivity', () => {
  it('has no diagonal-only road cells (every road touches a road edge-wise)', () => {
    for (const seed of [1, 2, 7, 42, 2024, 99999]) {
      const t = generateTerrain(seed);
      const single = t.filter((c) => c === 'road').length === 1;
      for (let r = 0; r < MAP_ROWS; r++) {
        for (let c = 0; c < MAP_COLS; c++) {
          if (t[r * MAP_COLS + c] !== 'road') continue;
          // Each road cell connects to at least one orthogonal road neighbor,
          // unless the whole map has only a single road cell.
          if (!single) expect(roadMask(t, MAP_COLS, c, r).length).toBeGreaterThan(0);
        }
      }
    }
  });
});
