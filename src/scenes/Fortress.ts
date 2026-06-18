import Phaser from 'phaser';
import { GAME_WIDTH } from '../main';
import { COLORS, FONT, FONT_FAMILY, HEX } from '../ui/theme';
import { makeButton } from '../ui/Button';
import { BuildMenu, type BuildSelection } from '../ui/BuildMenu';
import { getStructure } from '../data/structures';
import {
  canPlace,
  type FortressState,
  getCell,
  isCenterCell,
  placeStructure,
  removeStructure,
} from '../systems/grid';
import { loadOrCreateFortress, saveFortress } from '../systems/save';
import { BaseScene } from './BaseScene';

const GRID_TOP = 168;
const CELL = 82;

/**
 * Fortress build mode. Lay out a stronghold on a grid around the central,
 * indestructible capture point; placing/removing structures spends and refunds
 * resources, and the layout persists to localStorage.
 */
export class FortressScene extends BaseScene {
  private state!: FortressState;
  private selection: BuildSelection = { mode: 'none' };
  private gridOriginX = 0;
  private structGfx!: Phaser.GameObjects.Graphics;
  private labels: Phaser.GameObjects.Text[] = [];
  private sprites: Phaser.GameObjects.Image[] = [];
  private resourceText!: Phaser.GameObjects.Text;

  constructor() {
    super('Fortress');
  }

  create(): void {
    this.enter();
    this.state = loadOrCreateFortress();
    this.gridOriginX = (GAME_WIDTH - this.state.cols * CELL) / 2;

    this.heading('Fortress', 60);
    this.resourceText = this.add
      .text(this.cx, 116, '', {
        fontFamily: FONT_FAMILY,
        fontSize: FONT.body,
        color: COLORS.text,
      })
      .setOrigin(0.5);
    this.updateResourceText();

    this.drawGridLines();
    this.structGfx = this.add.graphics();
    this.makeCellZones();
    this.redrawStructures();

    new BuildMenu(this, {
      x: this.cx,
      y: GRID_TOP + this.state.rows * CELL + 60,
      onChange: (sel) => (this.selection = sel),
    });

    makeButton(this, {
      x: this.cx - 175,
      y: 1130,
      label: 'Back',
      variant: 'secondary',
      width: 330,
      height: 90,
      onClick: () => this.goTo('MainMenu'),
    });
    makeButton(this, {
      x: this.cx + 175,
      y: 1130,
      label: 'Enter Dungeon',
      variant: 'primary',
      width: 330,
      height: 90,
      onClick: () => this.goTo('Dungeon'),
    });
  }

  /** Center pixel of a grid cell. */
  private cellCenter(col: number, row: number): { x: number; y: number } {
    return {
      x: this.gridOriginX + col * CELL + CELL / 2,
      y: GRID_TOP + row * CELL + CELL / 2,
    };
  }

  private drawGridLines(): void {
    const g = this.add.graphics();
    const w = this.state.cols * CELL;
    const h = this.state.rows * CELL;
    g.fillStyle(HEX.gridCell, 1);
    g.fillRect(this.gridOriginX, GRID_TOP, w, h);
    g.lineStyle(1, HEX.gridLine, 1);
    for (let c = 0; c <= this.state.cols; c++) {
      const x = this.gridOriginX + c * CELL;
      g.lineBetween(x, GRID_TOP, x, GRID_TOP + h);
    }
    for (let r = 0; r <= this.state.rows; r++) {
      const y = GRID_TOP + r * CELL;
      g.lineBetween(this.gridOriginX, y, this.gridOriginX + w, y);
    }
  }

  private makeCellZones(): void {
    for (let row = 0; row < this.state.rows; row++) {
      for (let col = 0; col < this.state.cols; col++) {
        const { x, y } = this.cellCenter(col, row);
        this.add
          .zone(x, y, CELL, CELL)
          .setInteractive({ useHandCursor: true })
          .on('pointerup', () => this.handleCellTap(col, row));
      }
    }
  }

  private handleCellTap(col: number, row: number): void {
    if (isCenterCell(this.state, col, row)) {
      this.flashInvalid(col, row);
      return;
    }

    let changed = false;
    if (this.selection.mode === 'build') {
      if (canPlace(this.state, col, row, this.selection.defId)) {
        changed = placeStructure(this.state, col, row, this.selection.defId);
      }
    } else if (this.selection.mode === 'remove') {
      changed = removeStructure(this.state, col, row);
    }

    if (changed) {
      this.updateResourceText();
      this.redrawStructures();
      saveFortress(this.state);
    } else {
      this.flashInvalid(col, row);
    }
  }

  private redrawStructures(): void {
    this.structGfx.clear();
    this.labels.forEach((t) => t.destroy());
    this.labels = [];
    this.sprites.forEach((s) => s.destroy());
    this.sprites = [];

    const pad = 6;
    const size = CELL - pad * 2;
    for (let row = 0; row < this.state.rows; row++) {
      for (let col = 0; col < this.state.cols; col++) {
        const cell = getCell(this.state, col, row);
        if (!cell) continue;
        const def = getStructure(cell.structureId);
        if (!def) continue;
        const { x, y } = this.cellCenter(col, row);
        const isCenter = def.category === 'center';

        // Prefer real sprite art when the texture loaded; otherwise fall back to
        // the drawn colored shape + label so the build mode always renders.
        if (def.texKey && this.textures.exists(def.texKey)) {
          const sprite = this.add.image(x, y, def.texKey).setDisplaySize(size, size).setOrigin(0.5);
          this.sprites.push(sprite);
          continue;
        }

        this.structGfx.fillStyle(def.fillColor, isCenter ? 1 : 0.92);
        this.structGfx.lineStyle(isCenter ? 3 : 2, isCenter ? HEX.gold : HEX.panelBorder, 1);
        this.structGfx.fillRoundedRect(x - size / 2, y - size / 2, size, size, 10);
        this.structGfx.strokeRoundedRect(x - size / 2, y - size / 2, size, size, 10);

        const label = this.add
          .text(x, y, isCenter ? 'HOLD' : def.name, {
            fontFamily: FONT_FAMILY,
            fontSize: '16px',
            color: isCenter ? COLORS.bg : COLORS.text,
            fontStyle: isCenter ? 'bold' : 'normal',
          })
          .setOrigin(0.5);
        this.labels.push(label);
      }
    }
  }

  private flashInvalid(col: number, row: number): void {
    const { x, y } = this.cellCenter(col, row);
    const g = this.add.graphics();
    g.fillStyle(HEX.invalid, 0.5);
    g.fillRoundedRect(x - CELL / 2 + 4, y - CELL / 2 + 4, CELL - 8, CELL - 8, 8);
    this.tweens.add({
      targets: g,
      alpha: 0,
      duration: 280,
      onComplete: () => g.destroy(),
    });
  }

  private updateResourceText(): void {
    this.resourceText.setText(`Resources: ${this.state.resources}`);
  }
}
