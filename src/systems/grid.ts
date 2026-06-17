/**
 * Fortress grid model and build logic.
 *
 * Pure and framework-free (no Phaser imports) so it is fully unit-testable. The
 * scene renders this state and calls these helpers in response to taps; the save
 * system serializes it. Cells are stored in a flat array indexed
 * `row * cols + col`.
 */

import { CENTER_ID, getStructure, STARTING_RESOURCES } from '../data/structures';

export const GRID_COLS = 7;
export const GRID_ROWS = 9;

/** A grid cell: either empty (`null`) or holding one structure. */
export type FortressCell = { structureId: string } | null;

export interface FortressState {
  cols: number;
  rows: number;
  resources: number;
  cells: FortressCell[];
}

/** Column of the auto-placed capture center. */
export function centerCol(cols: number): number {
  return Math.floor(cols / 2);
}

/** Row of the auto-placed capture center. */
export function centerRow(rows: number): number {
  return Math.floor(rows / 2);
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

/** True if (col,row) is the indestructible capture center. */
export function isCenterCell(state: FortressState, col: number, row: number): boolean {
  return col === centerCol(state.cols) && row === centerRow(state.rows);
}

/** A fresh fortress: empty grid with the capture center placed and full resources. */
export function createInitialFortress(): FortressState {
  const cols = GRID_COLS;
  const rows = GRID_ROWS;
  const state: FortressState = {
    cols,
    rows,
    resources: STARTING_RESOURCES,
    cells: new Array<FortressCell>(cols * rows).fill(null),
  };
  state.cells[indexOf(state, centerCol(cols), centerRow(rows))] = { structureId: CENTER_ID };
  return state;
}

/**
 * Whether `defId` can be placed at (col,row): in bounds, not the center cell,
 * the cell is empty, the def exists and is affordable.
 */
export function canPlace(state: FortressState, col: number, row: number, defId: string): boolean {
  if (!inBounds(state, col, row)) return false;
  if (isCenterCell(state, col, row)) return false;
  if (getCell(state, col, row) !== null) return false;
  const def = getStructure(defId);
  if (!def || def.category === 'center') return false;
  return state.resources >= def.cost;
}

/**
 * Place a structure, deducting its cost. Mutates and returns `state`; the
 * boolean reports whether the placement happened.
 */
export function placeStructure(
  state: FortressState,
  col: number,
  row: number,
  defId: string
): boolean {
  if (!canPlace(state, col, row, defId)) return false;
  const def = getStructure(defId)!;
  state.cells[indexOf(state, col, row)] = { structureId: defId };
  state.resources -= def.cost;
  return true;
}

/**
 * Remove a structure, refunding its cost. The capture center can never be
 * removed. Mutates and returns `state`; the boolean reports whether anything
 * was removed.
 */
export function removeStructure(state: FortressState, col: number, row: number): boolean {
  if (!inBounds(state, col, row)) return false;
  if (isCenterCell(state, col, row)) return false;
  const cell = getCell(state, col, row);
  if (cell === null) return false;
  const def = getStructure(cell.structureId);
  state.cells[indexOf(state, col, row)] = null;
  if (def) state.resources += def.cost;
  return true;
}
