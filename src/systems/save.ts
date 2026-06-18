/**
 * Versioned localStorage persistence for the fortress layout.
 *
 * Serialization is intentionally **compact**: browsers cap localStorage at a few
 * MB shared across all keys, so we never store the full flat cell array (mostly
 * nulls) nor the terrain (it is regenerated from `seed`). Instead we persist a
 * sparse list of placed structures plus the seed, level, cleared obstacles and
 * resources, and rebuild the grid on load.
 *
 * The pure `serialize` / `deserialize` helpers are unit-tested; the
 * `save` / `load` wrappers add localStorage access with try/catch (private mode
 * / quota safety).
 */

import { createInitialFortress, type FortressState, indexOf } from './grid';
import { randomSeed } from './rng';

export const SAVE_KEY = 'fortgion.save.v2';
/** Previous save key, migrated forward on first load. */
const SAVE_KEY_V1 = 'fortgion.save.v1';
export const SAVE_VERSION = 2;

/** One placed structure: `[col, row, structureId]`. */
type PlacedTuple = [number, number, string];

/** Compact on-disk shape. Terrain is regenerated from `seed`, never stored. */
export interface SaveData {
  v: number;
  cols: number;
  rows: number;
  resources: number;
  level: number;
  seed: number;
  cleared: number[];
  placed: PlacedTuple[];
}

/** Flatten a fortress into the compact, sparse save shape. */
export function serialize(state: FortressState): SaveData {
  const placed: PlacedTuple[] = [];
  for (let row = 0; row < state.rows; row++) {
    for (let col = 0; col < state.cols; col++) {
      const cell = state.cells[indexOf(state, col, row)];
      if (cell) placed.push([col, row, cell.structureId]);
    }
  }
  return {
    v: SAVE_VERSION,
    cols: state.cols,
    rows: state.rows,
    resources: state.resources,
    level: state.level,
    seed: state.seed,
    cleared: [...state.cleared],
    placed,
  };
}

function isValidSave(data: unknown): data is SaveData {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>;
  if (d.v !== SAVE_VERSION) return false;
  if (typeof d.cols !== 'number' || typeof d.rows !== 'number') return false;
  if (typeof d.resources !== 'number') return false;
  if (typeof d.level !== 'number' || typeof d.seed !== 'number') return false;
  if (!Array.isArray(d.cleared) || !d.cleared.every((c) => typeof c === 'number')) return false;
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
 * malformed / a different version. Out-of-bounds placed entries are ignored
 * defensively.
 */
export function deserialize(data: unknown): FortressState | null {
  if (!isValidSave(data)) return null;
  const { cols, rows, resources, level, seed, cleared, placed } = data;
  const state: FortressState = {
    cols,
    rows,
    resources,
    level,
    seed,
    cleared: cleared.filter((i) => i >= 0 && i < cols * rows),
    cells: new Array(cols * rows).fill(null),
  };
  for (const [col, row, structureId] of placed) {
    if (col < 0 || col >= cols || row < 0 || row >= rows) continue;
    const i = indexOf(state, col, row);
    if (state.cells[i] === null) state.cells[i] = { structureId };
  }
  return state;
}

/**
 * Migrate a legacy v1 save. The v1 grid was a small 7×9 with an auto-placed
 * center and no terrain; those placements don't map onto the new 16×24
 * procedural map (and the stronghold is now player-built), so we keep only the
 * player's resources and otherwise start fresh with a new seed.
 */
function migrateV1(raw: string): FortressState | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const d = parsed as Record<string, unknown>;
  if (d.v !== 1) return null;
  const fresh = createInitialFortress(randomSeed());
  if (typeof d.resources === 'number') fresh.resources = d.resources;
  return fresh;
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
 * wrong-version save is cleared so it can't brick future loads. A legacy v1
 * save is migrated forward and rewritten as v2.
 */
export function loadFortress(): FortressState | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(SAVE_KEY);
  } catch {
    return null;
  }

  if (raw === null) {
    // No v2 save — try migrating a legacy v1 save.
    let v1: string | null = null;
    try {
      v1 = localStorage.getItem(SAVE_KEY_V1);
    } catch {
      return null;
    }
    if (v1 === null) return null;
    const migrated = migrateV1(v1);
    try {
      localStorage.removeItem(SAVE_KEY_V1);
    } catch {
      // ignore
    }
    if (migrated === null) return null;
    saveFortress(migrated);
    return migrated;
  }

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
