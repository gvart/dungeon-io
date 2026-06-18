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
 * Generate a deterministic map: mostly grass, a couple of orthogonally-connected
 * roads, a pond or two of water, and scattered clusters of trees and rocks.
 *
 * Order matters for connectivity: roads are carved first (as 4-connected walks),
 * then water fills around them (never over a road, which would gap the path),
 * then trees/rocks scatter only on open grass.
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

  // 1) Roads — orthogonal random walks, so every painted cell touches the next
  // along an edge (never only diagonally). One runs top→bottom, one left→right;
  // where they meet, autotiling renders a crossing/junction.
  carveRoad(t, cols, rows, rnd, true);
  carveRoad(t, cols, rows, rnd, false);

  // 2) Water ponds — circular blobs, but never over a road.
  const ponds = 1 + Math.floor(rnd() * 2);
  for (let p = 0; p < ponds; p++) {
    const cx = Math.floor(rnd() * cols);
    const cy = Math.floor(rnd() * rows);
    const radius = 1.4 + rnd() * 2.2;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (t[idx(c, r)] === 'road') continue;
        const dx = c - cx;
        const dy = r - cy;
        const dist = Math.sqrt(dx * dx + dy * dy) + (rnd() - 0.5) * 1.1;
        if (dist < radius) t[idx(c, r)] = 'water';
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

/**
 * Carve one road across the whole map. The main axis advances by one every step
 * (so it always terminates and spans the map); an occasional sidestep shifts the
 * cross axis and paints the bridging cell on the current line, keeping the path
 * 4-connected (no diagonal-only gaps). `vertical` runs top->bottom, else left->right.
 */
function carveRoad(
  t: TerrainType[],
  cols: number,
  rows: number,
  rnd: () => number,
  vertical: boolean
): void {
  const idx = (c: number, r: number): number => r * cols + c;
  if (vertical) {
    let c = Math.floor(rnd() * cols);
    for (let r = 0; r < rows; r++) {
      t[idx(c, r)] = 'road';
      const k = rnd();
      if (k < 0.15 && c > 0) t[idx(--c, r)] = 'road';
      else if (k > 0.85 && c < cols - 1) t[idx(++c, r)] = 'road';
    }
  } else {
    let r = Math.floor(rnd() * rows);
    for (let c = 0; c < cols; c++) {
      t[idx(c, r)] = 'road';
      const k = rnd();
      if (k < 0.15 && r > 0) t[idx(c, --r)] = 'road';
      else if (k > 0.85 && r < rows - 1) t[idx(c, ++r)] = 'road';
    }
  }
}

/**
 * Connected-neighbor key for a road cell, listing the in-bounds orthogonal
 * neighbors that are also roads in canonical `N,E,S,W` order (e.g. `"NES"`).
 * Used to pick the matching road tile so roads connect visually.
 */
export function roadMask(
  terrain: readonly TerrainType[],
  cols: number,
  col: number,
  row: number
): string {
  const rows = terrain.length / cols;
  const isRoad = (c: number, r: number): boolean =>
    c >= 0 && c < cols && r >= 0 && r < rows && terrain[r * cols + c] === 'road';
  let mask = '';
  if (isRoad(col, row - 1)) mask += 'N';
  if (isRoad(col + 1, row)) mask += 'E';
  if (isRoad(col, row + 1)) mask += 'S';
  if (isRoad(col - 1, row)) mask += 'W';
  return mask;
}
