import Phaser from 'phaser';
import { COLORS, FONT, FONT_FAMILY, HEX } from '../ui/theme';
import { makeButton } from '../ui/Button';
import { BuildPanel, type BuildSelection, PANEL_TOP } from '../ui/BuildPanel';
import { getStructure } from '../data/structures';
import {
  clearObstacle,
  type FortressState,
  getCell,
  inBounds,
  levelUp,
  placeStructure,
  removeStructure,
} from '../systems/grid';
import { generateTerrain, type TerrainType } from '../systems/terrain';
import { loadOrCreateFortress, saveFortress } from '../systems/save';
import { TerrainRenderer } from './fortress/TerrainRenderer';
import { MapCamera } from './fortress/MapCamera';
import { BaseScene } from './BaseScene';

/** On-screen size of a map cell (matches the 64px source tiles, 1:1). */
const CELL = 64;
/** Movement past this (design px) turns a press into a pan, not a tap. */
const DRAG_THRESHOLD = 12;
/** A press longer than this isn't a tap. */
const TAP_MAX_MS = 350;
/** UI bands (design px): taps here are UI, never map taps. */
const HEADER_BOTTOM = 150;
const FOOTER_TOP = 1080;

type Gesture = 'none' | 'pending' | 'pan' | 'pinch' | 'ui';

/**
 * Fortress build mode. A large, procedurally-generated terrain map the player
 * pans and zooms; they open the build panel, place a unique stronghold, clear
 * obstacles, and build level-gated defenses. The map renders on the main camera
 * (pannable/zoomable); a fixed UI camera keeps the HUD in place.
 */
export class FortressScene extends BaseScene {
  private state!: FortressState;
  private terrain!: TerrainType[];
  private selection: BuildSelection = { mode: 'none' };

  private mapLayer!: Phaser.GameObjects.Container;
  private uiLayer!: Phaser.GameObjects.Container;
  private uiCamera!: Phaser.Cameras.Scene2D.Camera;
  private terrainView!: TerrainRenderer;
  private mapCam!: MapCamera;

  private structGfx!: Phaser.GameObjects.Graphics;
  private gridGfx!: Phaser.GameObjects.Graphics;
  private sprites: Phaser.GameObjects.Image[] = [];
  private labels: Phaser.GameObjects.Text[] = [];

  private buildPanel!: BuildPanel;
  private hudText!: Phaser.GameObjects.Text;

  private gesture: Gesture = 'none';
  private downX = 0;
  private downY = 0;
  private downTime = 0;
  private pinchPrevDist = 0;

  constructor() {
    super('Fortress');
  }

  create(): void {
    this.state = loadOrCreateFortress();
    this.terrain = generateTerrain(this.state.seed, this.state.cols, this.state.rows);

    // Layers: map (pannable) and UI (fixed). Gate each by camera so neither
    // double-renders. Setting cameraFilter on the root containers gates the
    // whole subtree, including children added later (sprites, flashes, panel).
    this.mapLayer = this.add.container(0, 0);
    this.uiLayer = this.add.container(0, 0);
    this.uiCamera = this.cameras.add(0, 0, this.scale.width, this.scale.height);
    this.mapLayer.cameraFilter |= this.uiCamera.id;
    this.uiLayer.cameraFilter |= this.cameras.main.id;

    this.extraCameras.push(this.uiCamera);
    this.enter();

    const mapW = this.state.cols * CELL;
    const mapH = this.state.rows * CELL;

    this.terrainView = new TerrainRenderer(
      this,
      this.mapLayer,
      this.terrain,
      this.state.cols,
      this.state.rows,
      CELL,
      this.state.cleared
    );

    this.structGfx = this.add.graphics().setDepth(10);
    this.mapLayer.add(this.structGfx);
    this.gridGfx = this.add.graphics().setDepth(20).setVisible(false);
    this.mapLayer.add(this.gridGfx);
    this.drawGridLines(mapW, mapH);
    this.redrawStructures();

    this.mapCam = new MapCamera(this.cameras.main, mapW, mapH);
    this.wireInput();
    this.buildUi();
    this.updateHud();
  }

  // --- Rendering ----------------------------------------------------------

  private cellCenter(col: number, row: number): { x: number; y: number } {
    return { x: col * CELL + CELL / 2, y: row * CELL + CELL / 2 };
  }

  private drawGridLines(mapW: number, mapH: number): void {
    this.gridGfx.clear();
    this.gridGfx.lineStyle(1, HEX.gridLine, 0.5);
    for (let c = 0; c <= this.state.cols; c++) {
      this.gridGfx.lineBetween(c * CELL, 0, c * CELL, mapH);
    }
    for (let r = 0; r <= this.state.rows; r++) {
      this.gridGfx.lineBetween(0, r * CELL, mapW, r * CELL);
    }
  }

  private redrawStructures(): void {
    this.structGfx.clear();
    this.labels.forEach((t) => t.destroy());
    this.labels = [];
    this.sprites.forEach((s) => s.destroy());
    this.sprites = [];

    const pad = 5;
    const size = CELL - pad * 2;
    for (let row = 0; row < this.state.rows; row++) {
      for (let col = 0; col < this.state.cols; col++) {
        const cell = getCell(this.state, col, row);
        if (!cell) continue;
        const def = getStructure(cell.structureId);
        if (!def) continue;
        const { x, y } = this.cellCenter(col, row);
        const isHold = def.category === 'stronghold';

        if (def.texKey && this.textures.exists(def.texKey)) {
          const sprite = this.add.image(x, y, def.texKey).setOrigin(0.5).setDepth(10);
          if (def.category === 'wall') {
            sprite.setDisplaySize(CELL, CELL);
          } else {
            sprite.setScale(Math.min(size / sprite.width, size / sprite.height));
          }
          this.mapLayer.add(sprite);
          this.sprites.push(sprite);
          continue;
        }

        this.structGfx.fillStyle(def.fillColor, isHold ? 1 : 0.92);
        this.structGfx.lineStyle(isHold ? 3 : 2, isHold ? HEX.gold : HEX.panelBorder, 1);
        this.structGfx.fillRoundedRect(x - size / 2, y - size / 2, size, size, 8);
        this.structGfx.strokeRoundedRect(x - size / 2, y - size / 2, size, size, 8);

        const label = this.add
          .text(x, y, isHold ? 'HOLD' : def.name, {
            fontFamily: FONT_FAMILY,
            fontSize: '13px',
            color: isHold ? COLORS.bg : COLORS.text,
            fontStyle: isHold ? 'bold' : 'normal',
          })
          .setOrigin(0.5)
          .setDepth(10);
        this.mapLayer.add(label);
        this.labels.push(label);
      }
    }
  }

  private flashInvalid(col: number, row: number): void {
    const { x, y } = this.cellCenter(col, row);
    const g = this.add.graphics().setDepth(30);
    this.mapLayer.add(g);
    g.fillStyle(HEX.invalid, 0.5);
    g.fillRoundedRect(x - CELL / 2 + 3, y - CELL / 2 + 3, CELL - 6, CELL - 6, 6);
    this.tweens.add({ targets: g, alpha: 0, duration: 280, onComplete: () => g.destroy() });
  }

  // --- UI -----------------------------------------------------------------

  private buildUi(): void {
    this.uiLayer.add(this.heading('Fortress', 60));
    this.hudText = this.add
      .text(this.cx, 116, '', { fontFamily: FONT_FAMILY, fontSize: FONT.body, color: COLORS.text })
      .setOrigin(0.5);
    this.uiLayer.add(this.hudText);

    this.buildPanel = new BuildPanel(this, {
      onChange: (sel) => {
        this.selection = sel;
      },
      onLevelUp: () => this.handleLevelUp(),
    });
    this.uiLayer.add(this.buildPanel.root);

    this.uiLayer.add(
      makeButton(this, {
        x: this.cx,
        y: 1120,
        label: 'Build',
        variant: 'primary',
        width: 680,
        height: 84,
        onClick: () => this.toggleBuild(),
      })
    );
    this.uiLayer.add(
      makeButton(this, {
        x: this.cx - 175,
        y: 1210,
        label: 'Back',
        variant: 'secondary',
        width: 330,
        height: 84,
        onClick: () => this.goTo('MainMenu'),
      })
    );
    this.uiLayer.add(
      makeButton(this, {
        x: this.cx + 175,
        y: 1210,
        label: 'Enter Dungeon',
        variant: 'primary',
        width: 330,
        height: 84,
        onClick: () => this.goTo('Dungeon'),
      })
    );
  }

  private toggleBuild(): void {
    this.buildPanel.toggle();
    if (!this.buildPanel.isOpen()) this.selection = { mode: 'none' };
    this.gridGfx.setVisible(this.buildPanel.isOpen());
  }

  private updateHud(): void {
    this.hudText.setText(`Resources: ${this.state.resources}    Level: ${this.state.level}`);
    this.buildPanel.setLevel(this.state.level);
    this.buildPanel.setResources(this.state.resources);
  }

  private handleLevelUp(): void {
    if (levelUp(this.state)) {
      saveFortress(this.state);
      this.updateHud();
    }
  }

  // --- Input / gestures ---------------------------------------------------

  private wireInput(): void {
    this.input.addPointer(2);
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onPointerDown(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.onPointerMove(p));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.onPointerUp(p));
    this.input.on('wheel', (p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
      this.mapCam.zoomBy(dy > 0 ? 0.9 : 1.1, p.x, p.y);
    });
  }

  private isPointerOverUI(p: Phaser.Input.Pointer): boolean {
    if (p.y < HEADER_BOTTOM || p.y > FOOTER_TOP) return true;
    if (this.buildPanel.isOpen() && p.y >= PANEL_TOP) return true;
    return false;
  }

  private twoDown(): boolean {
    return this.input.pointer1.isDown && this.input.pointer2.isDown;
  }

  private onPointerDown(p: Phaser.Input.Pointer): void {
    if (this.twoDown()) {
      this.gesture = 'pinch';
      this.pinchPrevDist = this.pointerDistance();
      return;
    }
    if (this.isPointerOverUI(p)) {
      this.gesture = 'ui';
      return;
    }
    this.gesture = 'pending';
    this.downX = p.x;
    this.downY = p.y;
    this.downTime = this.time.now;
  }

  private onPointerMove(p: Phaser.Input.Pointer): void {
    if (this.gesture === 'ui') return;
    if (this.twoDown()) {
      this.gesture = 'pinch';
      const d = this.pointerDistance();
      if (this.pinchPrevDist > 0) {
        const midX = (this.input.pointer1.x + this.input.pointer2.x) / 2;
        const midY = (this.input.pointer1.y + this.input.pointer2.y) / 2;
        this.mapCam.zoomBy(d / this.pinchPrevDist, midX, midY);
      }
      this.pinchPrevDist = d;
      return;
    }
    if (this.gesture === 'pinch') return;
    if (this.gesture === 'pending') {
      if (Phaser.Math.Distance.Between(p.x, p.y, this.downX, this.downY) > DRAG_THRESHOLD) {
        this.gesture = 'pan';
      }
    }
    if (this.gesture === 'pan') {
      this.mapCam.panBy(p.x - p.prevPosition.x, p.y - p.prevPosition.y);
    }
  }

  private onPointerUp(p: Phaser.Input.Pointer): void {
    const stillDown = this.input.pointer1.isDown || this.input.pointer2.isDown;
    if (this.gesture === 'pinch') {
      this.pinchPrevDist = 0;
      if (!stillDown) this.gesture = 'none';
      return;
    }
    if (this.gesture === 'pan' || this.gesture === 'ui') {
      if (!stillDown) this.gesture = 'none';
      return;
    }
    if (this.gesture === 'pending') {
      const moved = Phaser.Math.Distance.Between(p.x, p.y, this.downX, this.downY);
      if (this.time.now - this.downTime < TAP_MAX_MS && moved < DRAG_THRESHOLD) {
        this.handleMapTap(p);
      }
      this.gesture = 'none';
    }
  }

  private pointerDistance(): number {
    return Phaser.Math.Distance.Between(
      this.input.pointer1.x,
      this.input.pointer1.y,
      this.input.pointer2.x,
      this.input.pointer2.y
    );
  }

  private handleMapTap(p: Phaser.Input.Pointer): void {
    const wp = this.cameras.main.getWorldPoint(p.x, p.y);
    const col = Math.floor(wp.x / CELL);
    const row = Math.floor(wp.y / CELL);
    if (!inBounds(this.state, col, row)) return;

    let changed = false;
    if (this.selection.mode === 'build') {
      changed = placeStructure(this.state, this.terrain, col, row, this.selection.defId);
    } else if (this.selection.mode === 'clear') {
      changed = clearObstacle(this.state, this.terrain, col, row);
      if (changed) this.terrainView.eraseCell(col, row);
    } else if (this.selection.mode === 'remove') {
      changed = removeStructure(this.state, col, row);
    }

    if (changed) {
      this.redrawStructures();
      this.updateHud();
      saveFortress(this.state);
    } else if (this.selection.mode !== 'none') {
      this.flashInvalid(col, row);
    }
  }
}
