/**
 * Fortress grid model and build logic.
 *
 * Pure and framework-free (no Phaser imports) so it is fully unit-testable. The
 * scene renders this state and calls these helpers in response to taps; the save
 * system serializes it. Cells are stored in a flat array indexed
 * `row * cols + col`.
 *
 * Terrain (grass/road/tree/rock/water) is *derived from a seed* and passed in to
 * the build-rule helpers rather than stored on the state — only the player's
 * progress (placed structures, cleared obstacles, level, resources, seed) is
 * persisted. Building is allowed on open ground or on a cleared obstacle cell.
 */

import {
  CLEAR_COST,
  getStructure,
  levelUpCost,
  MAX_LEVEL,
  STARTING_RESOURCES,
} from '../data/structures';
import { randomSeed } from './rng';
import {
  isBuildable,
  isClearable,
  MAP_COLS,
  MAP_ROWS,
  terrainAt,
  type TerrainType,
} from './terrain';

export const GRID_COLS = MAP_COLS;
export const GRID_ROWS = MAP_ROWS;

/**
 * A grid cell: either empty (`null`) or holding one structure. A freshly placed
 * structure is a *construction site* with `build` in `[0, 1)`; once it reaches 1
 * the field is dropped and the cell is a plain `{ structureId }` (so completed
 * structures serialize compactly and match older saves).
 */
export type FortressCell = { structureId: string; build?: number } | null;

export interface FortressState {
  cols: number;
  rows: number;
  resources: number;
  /** Fortress level; raised with resources to unlock higher-tier structures. */
  level: number;
  /** Seed the terrain is generated from (deterministic, so we never store it). */
  seed: number;
  /** Flat indices of obstacle cells the player has cleared to open ground. */
  cleared: number[];
  cells: FortressCell[];
}

/** Flat-array index for a cell, no bounds checking. */
export function indexOf(state: FortressState, col: number, row: number): number {
  return row * state.cols + col;
}

export function inBounds(state: FortressState, col: number, row: number): boolean {
  return col >= 0 && col < state.cols && row >= 0 && row < state.rows;
}

/** The cell at (col,row), or `null` if out of bounds or empty. */
export function getCell(state: FortressState, col: number, row: number): FortressCell {
  if (!inBounds(state, col, row)) return null;
  return state.cells[indexOf(state, col, row)];
}

/** Whether the obstacle at (col,row) has been cleared to open ground. */
export function isCleared(state: FortressState, col: number, row: number): boolean {
  return state.cleared.includes(indexOf(state, col, row));
}

/** True if any cell holds the given structure id (used for `unique` defs). */
export function hasStructure(state: FortressState, id: string): boolean {
  return state.cells.some((c) => c?.structureId === id);
}

/** A fresh fortress: empty grid, a random terrain seed, level 1, full resources. */
export function createInitialFortress(seed: number = randomSeed()): FortressState {
  const cols = GRID_COLS;
  const rows = GRID_ROWS;
  return {
    cols,
    rows,
    resources: STARTING_RESOURCES,
    level: 1,
    seed,
    cleared: [],
    cells: new Array<FortressCell>(cols * rows).fill(null),
  };
}

/** Whether a cell is open enough to build on: open ground or a cleared obstacle. */
export function isCellBuildable(
  state: FortressState,
  terrain: readonly TerrainType[],
  col: number,
  row: number
): boolean {
  const type = terrainAt(terrain, state.cols, col, row);
  return isBuildable(type) || isCleared(state, col, row);
}

/**
 * Whether `defId` can be placed at (col,row): in bounds, the cell is empty, the
 * terrain is buildable (or cleared), the def exists and is affordable, the
 * fortress level is high enough, and any `unique` def is not already placed.
 */
export function canPlace(
  state: FortressState,
  terrain: readonly TerrainType[],
  col: number,
  row: number,
  defId: string
): boolean {
  if (!inBounds(state, col, row)) return false;
  if (getCell(state, col, row) !== null) return false;
  if (!isCellBuildable(state, terrain, col, row)) return false;
  const def = getStructure(defId);
  if (!def) return false;
  if (state.level < def.requiredLevel) return false;
  if (def.unique && hasStructure(state, defId)) return false;
  return state.resources >= def.cost;
}

/**
 * Place a structure as a construction site (`build: 0`), deducting its cost. A
 * passive trickle plus hero assistance complete it over time. Mutates and
 * returns whether it placed.
 */
export function placeStructure(
  state: FortressState,
  terrain: readonly TerrainType[],
  col: number,
  row: number,
  defId: string
): boolean {
  if (!canPlace(state, terrain, col, row, defId)) return false;
  const def = getStructure(defId)!;
  state.cells[indexOf(state, col, row)] = { structureId: defId, build: 0 };
  state.resources -= def.cost;
  return true;
}

/** Build progress of a cell in `[0, 1]`: 1 when complete/absent, 0 when empty. */
export function structureBuildProgress(cell: FortressCell): number {
  if (cell === null) return 0;
  return cell.build ?? 1;
}

/** Whether the cell at (col,row) holds a structure that is still being built. */
export function isUnderConstruction(state: FortressState, col: number, row: number): boolean {
  const cell = getCell(state, col, row);
  return cell !== null && cell.build !== undefined && cell.build < 1;
}

/**
 * Advance the construction of the structure at (col,row) by `amount` (clamped to
 * `[0, 1]`). Completing it drops the `build` field. Returns the new progress, or
 * 0 if the cell is empty / already complete.
 */
export function advanceBuild(
  state: FortressState,
  col: number,
  row: number,
  amount: number
): number {
  const cell = getCell(state, col, row);
  if (cell === null || cell.build === undefined) return cell ? 1 : 0;
  const next = cell.build + Math.max(0, amount);
  if (next >= 1) {
    delete cell.build;
    return 1;
  }
  cell.build = next;
  return next;
}

/**
 * Remove a structure, refunding its cost. Non-removable structures (the
 * stronghold) are refused. Mutates and returns whether anything was removed.
 */
export function removeStructure(state: FortressState, col: number, row: number): boolean {
  if (!inBounds(state, col, row)) return false;
  const cell = getCell(state, col, row);
  if (cell === null) return false;
  const def = getStructure(cell.structureId);
  if (def && def.removable === false) return false;
  state.cells[indexOf(state, col, row)] = null;
  if (def) state.resources += def.cost;
  return true;
}

/**
 * Clear a tree/rock obstacle, opening the cell for building. Costs resources.
 * Water cannot be cleared. Mutates and returns whether anything was cleared.
 */
export function clearObstacle(
  state: FortressState,
  terrain: readonly TerrainType[],
  col: number,
  row: number
): boolean {
  if (!inBounds(state, col, row)) return false;
  if (getCell(state, col, row) !== null) return false;
  if (isCleared(state, col, row)) return false;
  if (!isClearable(terrainAt(terrain, state.cols, col, row))) return false;
  if (state.resources < CLEAR_COST) return false;
  state.cleared.push(indexOf(state, col, row));
  state.resources -= CLEAR_COST;
  return true;
}

/** Raise the fortress level, spending resources. Returns whether it leveled up. */
export function levelUp(state: FortressState): boolean {
  if (state.level >= MAX_LEVEL) return false;
  const cost = levelUpCost(state.level);
  if (state.resources < cost) return false;
  state.resources -= cost;
  state.level += 1;
  return true;
}
