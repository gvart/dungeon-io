import Phaser from 'phaser';
import { ROAD_TEX, TERRAIN_HEX, TERRAIN_TEX } from '../../ui/theme';
import { roadMask, type TerrainType } from '../../systems/terrain';

/**
 * Renders the procedurally-generated terrain into a single static
 * {@link Phaser.GameObjects.RenderTexture}. One GPU texture and one display
 * object is far cheaper on mobile than ~400 sprites and needs no per-object
 * camera-ignore bookkeeping (the whole layer lives in the map container).
 *
 * Every cell stamps a grass base first, then its feature on top: roads are
 * autotiled from their connected neighbors (see {@link roadMask}) so they join
 * up correctly; trees/rocks pick a deterministic variant; water replaces the
 * base. Cleared obstacles render as grass. A missing texture falls back to a
 * flat color so the build mode always renders.
 */
export class TerrainRenderer {
  private readonly rt?: Phaser.GameObjects.RenderTexture;
  private readonly terrain: readonly TerrainType[];
  private readonly cols: number;

  constructor(
    private readonly scene: Phaser.Scene,
    parent: Phaser.GameObjects.Container,
    terrain: readonly TerrainType[],
    cols: number,
    rows: number,
    private readonly cell: number,
    clearedIndices: readonly number[]
  ) {
    this.terrain = terrain;
    this.cols = cols;

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

    if (type === 'water') {
      this.put(TERRAIN_TEX.water[0], type, x, y);
      return;
    }

    // Grass base under everything else, so transparent road pieces blend in.
    this.put(TERRAIN_TEX.grass[0], 'grass', x, y);
    if (type === 'road') {
      this.put(ROAD_TEX[roadMask(this.terrain, this.cols, col, row)], 'road', x, y);
    } else if (type === 'tree' || type === 'rock') {
      const variants = TERRAIN_TEX[type];
      this.put(variants[this.variantIndex(col, row, variants.length)], type, x, y);
    }
  }

  /** Draw a tile texture, or a flat fallback color if the texture is missing. */
  private put(key: string, type: TerrainType, x: number, y: number): void {
    if (!this.rt) return;
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
