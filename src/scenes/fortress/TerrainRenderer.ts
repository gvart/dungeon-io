import Phaser from 'phaser';
import { TERRAIN_HEX, TERRAIN_TEX } from '../../ui/theme';
import type { TerrainType } from '../../systems/terrain';

/**
 * Renders the procedurally-generated terrain into a single static
 * {@link Phaser.GameObjects.RenderTexture}. One GPU texture and one display
 * object is far cheaper on mobile than ~400 sprites and needs no per-object
 * camera-ignore bookkeeping (the whole layer lives in the map container).
 *
 * Each terrain type maps to one or more opaque tile textures; a deterministic
 * per-cell hash picks the variant so the map looks the same across reloads.
 * Cleared obstacles are drawn as grass. A missing tile texture falls back to a
 * flat color so the build mode always renders.
 */
export class TerrainRenderer {
  private readonly rt?: Phaser.GameObjects.RenderTexture;

  constructor(
    private readonly scene: Phaser.Scene,
    parent: Phaser.GameObjects.Container,
    terrain: readonly TerrainType[],
    cols: number,
    rows: number,
    private readonly cell: number,
    clearedIndices: readonly number[]
  ) {
    // RenderTexture allocates a GPU render target on creation; skip it when
    // there is no renderer (e.g. the HEADLESS test environment) so the scene
    // still builds. Real WebGL/Canvas runs always have a renderer.
    if (!scene.game.renderer) return;

    this.rt = scene.add
      .renderTexture(0, 0, cols * cell, rows * cell)
      .setOrigin(0, 0)
      .setDepth(0);
    parent.add(this.rt);

    const cleared = new Set(clearedIndices);
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const i = row * cols + col;
        const raw = terrain[i] ?? 'grass';
        const type = cleared.has(i) && (raw === 'tree' || raw === 'rock') ? 'grass' : raw;
        this.stamp(col, row, type);
      }
    }
  }

  /** Re-stamp a single cell as open grass (after clearing an obstacle). */
  eraseCell(col: number, row: number): void {
    this.stamp(col, row, 'grass');
  }

  private stamp(col: number, row: number, type: TerrainType): void {
    if (!this.rt) return;
    const x = col * this.cell;
    const y = row * this.cell;
    const variants = TERRAIN_TEX[type];
    const key = variants[this.variantIndex(col, row, variants.length)];
    if (this.scene.textures.exists(key)) {
      this.rt.draw(key, x, y);
    } else {
      this.rt.fill(TERRAIN_HEX[type], 1, x, y, this.cell, this.cell);
    }
  }

  /** Stable variant choice per cell so the map is identical on every render. */
  private variantIndex(col: number, row: number, count: number): number {
    if (count <= 1) return 0;
    const h = (Math.imul(col, 73856093) ^ Math.imul(row, 19349663)) >>> 0;
    return h % count;
  }
}
