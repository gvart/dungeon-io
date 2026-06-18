import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../main';

/**
 * Pan/zoom controller for the map camera. Owns bounds and zoom clamping; the
 * scene drives it from its pointer/gesture state machine via the primitive
 * `panBy` / `zoomBy` ops (keeping the gesture bookkeeping in one place).
 *
 * `MIN_ZOOM` is derived from the map/viewport ratio so the map always covers the
 * screen — otherwise `setBounds` clamping fights an over-zoomed-out camera.
 */
export class MapCamera {
  readonly minZoom: number;
  readonly maxZoom = 2;

  constructor(
    private readonly cam: Phaser.Cameras.Scene2D.Camera,
    mapWidth: number,
    mapHeight: number
  ) {
    this.minZoom = Math.max(GAME_WIDTH / mapWidth, GAME_HEIGHT / mapHeight);
    cam.setBounds(0, 0, mapWidth, mapHeight);
    cam.setZoom(Phaser.Math.Clamp(1, this.minZoom, this.maxZoom));
    cam.centerOn(mapWidth / 2, mapHeight / 2);
  }

  /** Pan by a screen-space delta (kept 1:1 with the finger at any zoom). */
  panBy(dxScreen: number, dyScreen: number): void {
    this.cam.scrollX -= dxScreen / this.cam.zoom;
    this.cam.scrollY -= dyScreen / this.cam.zoom;
  }

  /** Multiply zoom by `factor`, keeping the world point under (sx,sy) fixed. */
  zoomBy(factor: number, sx: number, sy: number): void {
    const target = Phaser.Math.Clamp(this.cam.zoom * factor, this.minZoom, this.maxZoom);
    if (target === this.cam.zoom) return;
    const before = this.cam.getWorldPoint(sx, sy);
    this.cam.setZoom(target);
    const after = this.cam.getWorldPoint(sx, sy);
    this.cam.scrollX += before.x - after.x;
    this.cam.scrollY += before.y - after.y;
  }
}
