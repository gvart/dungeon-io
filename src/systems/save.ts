/**
 * Versioned localStorage persistence for the fortress layout.
 *
 * Serialization is intentionally **compact**: browsers cap localStorage at a few
 * MB shared across all keys, so we never store the full flat cell array (mostly
 * nulls). Instead we persist a sparse list of placed structures and rebuild the
 * grid on load — the capture center is geometry-derived, not stored. This keeps
 * the payload bounded by structure count and leaves headroom for the hero / run
 * / meta saves later phases add.
 *
 * The pure `serialize` / `deserialize` helpers are unit-tested; the
 * `save` / `load` wrappers add localStorage access with try/catch (private mode
 * / quota safety).
 */

import { CENTER_ID } from '../data/structures';
import {
  centerCol,
  centerRow,
  createInitialFortress,
  type FortressState,
  GRID_COLS,
  GRID_ROWS,
  indexOf,
} from './grid';

export const SAVE_KEY = 'fortgion.save.v1';
export const SAVE_VERSION = 1;

/** One placed structure: `[col, row, structureId]`. */
type PlacedTuple = [number, number, string];

/** Compact on-disk shape. `placed` excludes the geometry-derived center. */
export interface SaveData {
  v: number;
  cols: number;
  rows: number;
  resources: number;
  placed: PlacedTuple[];
}

/** Flatten a fortress into the compact, sparse save shape. */
export function serialize(state: FortressState): SaveData {
  const placed: PlacedTuple[] = [];
  for (let row = 0; row < state.rows; row++) {
    for (let col = 0; col < state.cols; col++) {
      const cell = state.cells[indexOf(state, col, row)];
      if (cell && cell.structureId !== CENTER_ID) {
        placed.push([col, row, cell.structureId]);
      }
    }
  }
  return {
    v: SAVE_VERSION,
    cols: state.cols,
    rows: state.rows,
    resources: state.resources,
    placed,
  };
}

function isValidSave(data: unknown): data is SaveData {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>;
  if (d.v !== SAVE_VERSION) return false;
  if (typeof d.cols !== 'number' || typeof d.rows !== 'number') return false;
  if (typeof d.resources !== 'number') return false;
  if (!Array.isArray(d.placed)) return false;
  return d.placed.every(
    (p) =>
      Array.isArray(p) &&
      p.length === 3 &&
      typeof p[0] === 'number' &&
      typeof p[1] === 'number' &&
      typeof p[2] === 'string'
  );
}

/**
 * Rebuild a full fortress from compact save data, or `null` if the data is
 * malformed / a different version. The capture center is re-placed from geometry.
 * Out-of-bounds placed entries are ignored defensively.
 */
export function deserialize(data: unknown): FortressState | null {
  if (!isValidSave(data)) return null;
  const { cols, rows, resources, placed } = data;
  const state: FortressState = {
    cols,
    rows,
    resources,
    cells: new Array(cols * rows).fill(null),
  };
  state.cells[indexOf(state, centerCol(cols), centerRow(rows))] = { structureId: CENTER_ID };
  for (const [col, row, structureId] of placed) {
    if (col < 0 || col >= cols || row < 0 || row >= rows) continue;
    const i = indexOf(state, col, row);
    if (state.cells[i] === null) state.cells[i] = { structureId };
  }
  return state;
}

/** Persist the fortress. Swallows storage errors (private mode / quota). */
export function saveFortress(state: FortressState): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(serialize(state)));
  } catch {
    // Storage unavailable (private mode / quota) — fail silently; the in-memory
    // fortress still works for the session.
  }
}

/**
 * Load and rebuild the fortress, or `null` when absent. A corrupt or
 * wrong-version save is cleared so it can't brick future loads.
 */
export function loadFortress(): FortressState | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(SAVE_KEY);
  } catch {
    return null;
  }
  if (raw === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    clearSave();
    return null;
  }
  const state = deserialize(parsed);
  if (state === null) {
    clearSave();
    return null;
  }
  return state;
}

/** Load the saved fortress, or create a fresh one if none/invalid. */
export function loadOrCreateFortress(): FortressState {
  return loadFortress() ?? createInitialFortress();
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // ignore
  }
}

// Referenced for default dims symmetry / future migrations.
export const DEFAULT_DIMS = { cols: GRID_COLS, rows: GRID_ROWS } as const;
