/**
 * Grid pathfinding for hero movement.
 *
 * Pure and framework-free (no Phaser) so it is unit-testable and deterministic.
 * Heroes walk the 4-connected fortress grid; this module decides which cells are
 * walkable and finds a least-steps path around obstacles with A*.
 *
 * Walkability mirrors the build rules' terrain model: water is never passable,
 * uncleared trees/rocks block until cleared, and structure cells block unless the
 * structure def is `passable` (gates). Cleared obstacles and open ground are
 * walkable.
 */

import { getStructure } from '../data/structures';
import { getCell, type FortressState, indexOf, inBounds, isCleared } from './grid';
import { isClearable, terrainAt, type TerrainType } from './terrain';

/** Whether a hero may stand on / walk through the cell at (col,row). */
export function isWalkable(
  state: FortressState,
  terrain: readonly TerrainType[],
  col: number,
  row: number
): boolean {
  if (!inBounds(state, col, row)) return false;
  const type = terrainAt(terrain, state.cols, col, row);
  if (type === 'water') return false;
  // Uncleared obstacles block; clearing them opens the cell.
  if (isClearable(type) && !isCleared(state, col, row)) return false;
  const cell = getCell(state, col, row);
  if (cell !== null) {
    // A structure (even under construction) blocks unless it is passable (gate).
    return getStructure(cell.structureId)?.passable === true;
  }
  return true;
}

/** Orthogonal neighbor offsets, fixed order for deterministic expansion. */
const NEIGHBORS: ReadonlyArray<readonly [number, number]> = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

function manhattan(c1: number, r1: number, c2: number, r2: number): number {
  return Math.abs(c1 - c2) + Math.abs(r1 - r2);
}

/**
 * Least-steps A* path of flat cell indices from start to goal (inclusive), or
 * `null` if unreachable. Both endpoints must be walkable. Ties are broken toward
 * the lower flat index so the path is reproducible.
 */
export function findPath(
  state: FortressState,
  terrain: readonly TerrainType[],
  startCol: number,
  startRow: number,
  goalCol: number,
  goalRow: number
): number[] | null {
  if (!isWalkable(state, terrain, startCol, startRow)) return null;
  if (!isWalkable(state, terrain, goalCol, goalRow)) return null;

  const cols = state.cols;
  const start = indexOf(state, startCol, startRow);
  const goal = indexOf(state, goalCol, goalRow);
  if (start === goal) return [start];

  const n = state.cols * state.rows;
  const gScore = new Array<number>(n).fill(Infinity);
  const fScore = new Array<number>(n).fill(Infinity);
  const cameFrom = new Array<number>(n).fill(-1);
  const open = new Set<number>();

  gScore[start] = 0;
  fScore[start] = manhattan(startCol, startRow, goalCol, goalRow);
  open.add(start);

  while (open.size > 0) {
    // Pick the open node with lowest f, tie-broken by lower index.
    let current = -1;
    let bestF = Infinity;
    for (const idx of open) {
      const f = fScore[idx];
      if (f < bestF || (f === bestF && idx < current)) {
        bestF = f;
        current = idx;
      }
    }

    if (current === goal) {
      const path: number[] = [current];
      let c = current;
      while (cameFrom[c] !== -1) {
        c = cameFrom[c];
        path.push(c);
      }
      return path.reverse();
    }

    open.delete(current);
    const cc = current % cols;
    const cr = Math.floor(current / cols);
    const tentative = gScore[current] + 1;

    for (const [dc, dr] of NEIGHBORS) {
      const nc = cc + dc;
      const nr = cr + dr;
      if (!isWalkable(state, terrain, nc, nr)) continue;
      const ni = nr * cols + nc;
      if (tentative < gScore[ni]) {
        cameFrom[ni] = current;
        gScore[ni] = tentative;
        fScore[ni] = tentative + manhattan(nc, nr, goalCol, goalRow);
        open.add(ni);
      }
    }
  }

  return null;
}

/**
 * Path to the nearest walkable orthogonal neighbor of a (possibly non-walkable)
 * target cell — used to reach a build site or other structure to work on it.
 * Returns the shortest such path, or `null` if no neighbor is reachable.
 */
export function findPathAdjacent(
  state: FortressState,
  terrain: readonly TerrainType[],
  startCol: number,
  startRow: number,
  targetCol: number,
  targetRow: number
): number[] | null {
  // Already adjacent (or on the target)? No move needed.
  if (manhattan(startCol, startRow, targetCol, targetRow) <= 1) {
    return [indexOf(state, startCol, startRow)];
  }
  let best: number[] | null = null;
  for (const [dc, dr] of NEIGHBORS) {
    const nc = targetCol + dc;
    const nr = targetRow + dr;
    if (!isWalkable(state, terrain, nc, nr)) continue;
    const path = findPath(state, terrain, startCol, startRow, nc, nr);
    if (path && (best === null || path.length < best.length)) best = path;
  }
  return best;
}
