import { describe, expect, it } from 'vitest';
import { getStructure } from '../data/structures';
import { createInitialFortress, type FortressState, indexOf, placeStructure } from './grid';
import { findPath, findPathAdjacent, isWalkable } from './pathfind';
import { type TerrainType } from './terrain';

function grass(state: FortressState): TerrainType[] {
  return new Array<TerrainType>(state.cols * state.rows).fill('grass');
}

describe('isWalkable', () => {
  it('blocks water, uncleared obstacles, and out-of-bounds', () => {
    const s = createInitialFortress(1);
    const t = grass(s);
    t[indexOf(s, 1, 1)] = 'water';
    t[indexOf(s, 2, 2)] = 'tree';
    expect(isWalkable(s, t, 1, 1)).toBe(false);
    expect(isWalkable(s, t, 2, 2)).toBe(false);
    expect(isWalkable(s, t, -1, 0)).toBe(false);
    expect(isWalkable(s, t, 0, 0)).toBe(true); // grass
  });

  it('treats a cleared obstacle as walkable', () => {
    const s = createInitialFortress(1);
    const t = grass(s);
    t[indexOf(s, 3, 3)] = 'rock';
    expect(isWalkable(s, t, 3, 3)).toBe(false);
    s.cleared.push(indexOf(s, 3, 3));
    expect(isWalkable(s, t, 3, 3)).toBe(true);
  });

  it('blocks walls/strongholds but allows passable gates', () => {
    const s = createInitialFortress(1);
    const t = grass(s);
    placeStructure(s, t, 4, 4, 'wall');
    placeStructure(s, t, 5, 5, 'gate');
    expect(getStructure('gate')?.passable).toBe(true);
    expect(isWalkable(s, t, 4, 4)).toBe(false); // wall blocks even mid-build
    expect(isWalkable(s, t, 5, 5)).toBe(true); // gate passable
  });
});

describe('findPath', () => {
  it('finds a straight path on open ground (least steps)', () => {
    const s = createInitialFortress(1);
    const t = grass(s);
    const path = findPath(s, t, 0, 0, 0, 4);
    expect(path).not.toBeNull();
    expect(path!.length).toBe(5); // 4 steps, inclusive endpoints
    expect(path![0]).toBe(indexOf(s, 0, 0));
    expect(path![path!.length - 1]).toBe(indexOf(s, 0, 4));
  });

  it('routes around a wall barrier', () => {
    const s = createInitialFortress(1);
    const t = grass(s);
    // Vertical wall on column 2, rows 0..3 — must detour around row 4.
    for (let r = 0; r < 4; r++) placeStructure(s, t, 2, r, 'wall');
    const path = findPath(s, t, 1, 0, 3, 0);
    expect(path).not.toBeNull();
    // Path must avoid every wall cell.
    for (let r = 0; r < 4; r++) expect(path!).not.toContain(indexOf(s, 2, r));
  });

  it('returns null when the goal is enclosed', () => {
    const s = createInitialFortress(1);
    const t = grass(s);
    // Surround (5,5) with water on all four sides.
    t[indexOf(s, 4, 5)] = 'water';
    t[indexOf(s, 6, 5)] = 'water';
    t[indexOf(s, 5, 4)] = 'water';
    t[indexOf(s, 5, 6)] = 'water';
    expect(findPath(s, t, 0, 0, 5, 5)).toBeNull();
  });

  it('is deterministic (same path each call)', () => {
    const s = createInitialFortress(1);
    const t = grass(s);
    const a = findPath(s, t, 0, 0, 5, 5);
    const b = findPath(s, t, 0, 0, 5, 5);
    expect(a).toEqual(b);
  });

  it('returns a single cell when start equals goal', () => {
    const s = createInitialFortress(1);
    const t = grass(s);
    expect(findPath(s, t, 2, 2, 2, 2)).toEqual([indexOf(s, 2, 2)]);
  });
});

describe('findPathAdjacent', () => {
  it('reaches a neighbor of a non-walkable structure cell', () => {
    const s = createInitialFortress(1);
    const t = grass(s);
    placeStructure(s, t, 5, 5, 'wall'); // non-walkable target
    const path = findPathAdjacent(s, t, 0, 0, 5, 5);
    expect(path).not.toBeNull();
    const last = path![path!.length - 1];
    const lc = last % s.cols;
    const lr = Math.floor(last / s.cols);
    expect(Math.abs(lc - 5) + Math.abs(lr - 5)).toBe(1); // orthogonally adjacent
  });
});
