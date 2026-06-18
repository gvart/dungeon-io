/**
 * Procedural terrain for the fortress map.
 *
 * Pure and framework-free (no Phaser) so it is unit-testable and deterministic:
 * the same seed always produces the same map. Terrain is therefore *derived*
 * from the saved seed and never persisted in full. The scene renders it and the
 * grid/build rules consult it (a cell is buildable only on open ground).
 */

import { mulberry32 } from './rng';

export type TerrainType = 'grass' | 'road' | 'tree' | 'rock' | 'water';

/** Default map size — larger than the viewport so the camera pans/zooms over it. */
export const MAP_COLS = 16;
export const MAP_ROWS = 24;

const BUILDABLE = new Set<TerrainType>(['grass', 'road']);
const CLEARABLE = new Set<TerrainType>(['tree', 'rock']);

/** Open ground you can build on directly. */
export function isBuildable(t: TerrainType): boolean {
  return BUILDABLE.has(t);
}

/** Obstacles that block building until cleared (water is never clearable). */
export function isClearable(t: TerrainType): boolean {
  return CLEARABLE.has(t);
}

/** Terrain type at (col,row); `grass` for out-of-range to stay defensive. */
export function terrainAt(
  terrain: readonly TerrainType[],
  cols: number,
  col: number,
  row: number
): TerrainType {
  return terrain[row * cols + col] ?? 'grass';
}

/**
 * Generate a deterministic map: mostly grass, a pond or two of water, a couple
 * of meandering roads, and scattered clusters of trees and rocks. Trees/rocks
 * only spawn on open grass, so roads and water stay intact.
 */
export function generateTerrain(
  seed: number,
  cols: number = MAP_COLS,
  rows: number = MAP_ROWS
): TerrainType[] {
  const rnd = mulberry32(seed);
  const n = cols * rows;
  const t: TerrainType[] = new Array<TerrainType>(n).fill('grass');
  const idx = (c: number, r: number): number => r * cols + c;
  const inB = (c: number, r: number): boolean => c >= 0 && c < cols && r >= 0 && r < rows;

  // 1) Water ponds — circular blobs with a jittered edge.
  const ponds = 1 + Math.floor(rnd() * 2);
  for (let p = 0; p < ponds; p++) {
    const cx = Math.floor(rnd() * cols);
    const cy = Math.floor(rnd() * rows);
    const radius = 1.4 + rnd() * 2.2;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const dx = c - cx;
        const dy = r - cy;
        const dist = Math.sqrt(dx * dx + dy * dy) + (rnd() - 0.5) * 1.1;
        if (dist < radius) t[idx(c, r)] = 'water';
      }
    }
  }

  // 2) Roads — a couple of paths that wander across the map, skipping water.
  for (let road = 0; road < 2; road++) {
    if (rnd() < 0.5) {
      let c = Math.floor(rnd() * cols);
      for (let r = 0; r < rows; r++) {
        if (inB(c, r) && t[idx(c, r)] !== 'water') t[idx(c, r)] = 'road';
        const step = rnd();
        if (step < 0.25) c = Math.max(0, c - 1);
        else if (step > 0.75) c = Math.min(cols - 1, c + 1);
      }
    } else {
      let r = Math.floor(rnd() * rows);
      for (let c = 0; c < cols; c++) {
        if (inB(c, r) && t[idx(c, r)] !== 'water') t[idx(c, r)] = 'road';
        const step = rnd();
        if (step < 0.25) r = Math.max(0, r - 1);
        else if (step > 0.75) r = Math.min(rows - 1, r + 1);
      }
    }
  }

  // 3) Trees & rocks — clustered scatter, only on open grass.
  const clusters = Math.floor(n * 0.05);
  for (let k = 0; k < clusters; k++) {
    const cx = Math.floor(rnd() * cols);
    const cy = Math.floor(rnd() * rows);
    const kind: TerrainType = rnd() < 0.6 ? 'tree' : 'rock';
    const size = 1 + Math.floor(rnd() * 4);
    for (let s = 0; s < size; s++) {
      const c = cx + Math.floor((rnd() - 0.5) * 3);
      const r = cy + Math.floor((rnd() - 0.5) * 3);
      if (inB(c, r) && t[idx(c, r)] === 'grass') t[idx(c, r)] = kind;
    }
  }

  return t;
}
