import Phaser from 'phaser';
import { COLORS, FONT, FONT_FAMILY, HEX, TOUCH_MIN } from './theme';

export interface ChipConfig {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  sub: string;
  onTap: () => void;
}

/**
 * A small tappable chip (drawn — no dedicated texture). Supports a selected
 * highlight and a disabled/locked state. Shared by the build panel and any
 * other compact menu; extracted from the old BuildMenu.
 */
export class Chip extends Phaser.GameObjects.Container {
  private readonly gfx: Phaser.GameObjects.Graphics;
  private readonly titleText: Phaser.GameObjects.Text;
  private readonly subText: Phaser.GameObjects.Text;
  private readonly chipW: number;
  private readonly chipH: number;
  private selected = false;
  private enabled = true;

  constructor(scene: Phaser.Scene, cfg: ChipConfig) {
    super(scene, cfg.x, cfg.y);
    this.chipW = Math.max(cfg.w, TOUCH_MIN);
    this.chipH = Math.max(cfg.h, TOUCH_MIN);

    this.gfx = scene.add.graphics();
    this.add(this.gfx);

    this.titleText = scene.add
      .text(0, -12, cfg.title, {
        fontFamily: FONT_FAMILY,
        fontSize: FONT.small,
        color: COLORS.text,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.subText = scene.add
      .text(0, 14, cfg.sub, { fontFamily: FONT_FAMILY, fontSize: '14px', color: COLORS.muted })
      .setOrigin(0.5);
    this.add([this.titleText, this.subText]);

    this.setSize(this.chipW, this.chipH);
    this.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(-this.chipW / 2, -this.chipH / 2, this.chipW, this.chipH),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    });
    this.on('pointerup', () => {
      if (this.enabled) cfg.onTap();
    });

    this.redraw();
    scene.add.existing(this);
  }

  setSelected(active: boolean): this {
    this.selected = active;
    this.redraw();
    return this;
  }

  setEnabled(enabled: boolean): this {
    this.enabled = enabled;
    this.redraw();
    return this;
  }

  setSub(sub: string): this {
    this.subText.setText(sub);
    return this;
  }

  setTitle(title: string): this {
    this.titleText.setText(title);
    return this;
  }

  private redraw(): void {
    const r = 12;
    const fill = this.selected ? HEX.buttonFillDown : HEX.buttonFill;
    const border = this.selected ? HEX.selected : HEX.panelBorder;
    this.gfx.clear();
    this.gfx.fillStyle(fill, 1);
    this.gfx.lineStyle(this.selected ? 3 : 2, border, 1);
    this.gfx.fillRoundedRect(-this.chipW / 2, -this.chipH / 2, this.chipW, this.chipH, r);
    this.gfx.strokeRoundedRect(-this.chipW / 2, -this.chipH / 2, this.chipW, this.chipH, r);
    this.setAlpha(this.enabled ? 1 : 0.45);
    this.titleText.setColor(this.enabled ? COLORS.text : COLORS.dim);
  }
}
