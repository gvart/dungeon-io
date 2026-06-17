import Phaser from 'phaser';
import { COLORS, FONT, FONT_FAMILY, HEX, TOUCH_MIN } from './theme';
import { BUILDABLE, getStructure } from '../data/structures';

/** Current build-menu selection driving what a grid tap does. */
export type BuildSelection =
  | { mode: 'build'; defId: string }
  | { mode: 'remove' }
  | { mode: 'none' };

export interface BuildMenuConfig {
  /** Center x for the menu row. */
  x: number;
  /** Center y for the menu row. */
  y: number;
  /** Notified whenever the selection changes. */
  onChange: (selection: BuildSelection) => void;
}

/** A single tappable chip in the build menu (drawn — no dedicated texture). */
class MenuChip extends Phaser.GameObjects.Container {
  private readonly gfx: Phaser.GameObjects.Graphics;
  private readonly chipW: number;
  private readonly chipH: number;
  private chipActive = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    w: number,
    h: number,
    title: string,
    sub: string,
    private readonly onTap: () => void
  ) {
    super(scene, x, y);
    this.chipW = Math.max(w, TOUCH_MIN);
    this.chipH = Math.max(h, TOUCH_MIN);

    this.gfx = scene.add.graphics();
    this.add(this.gfx);

    const titleText = scene.add
      .text(0, -12, title, {
        fontFamily: FONT_FAMILY,
        fontSize: FONT.small,
        color: COLORS.text,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    const subText = scene.add
      .text(0, 14, sub, {
        fontFamily: FONT_FAMILY,
        fontSize: '14px',
        color: COLORS.muted,
      })
      .setOrigin(0.5);
    this.add([titleText, subText]);

    this.setSize(this.chipW, this.chipH);
    this.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(-this.chipW / 2, -this.chipH / 2, this.chipW, this.chipH),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    });
    this.on('pointerup', () => this.onTap());

    this.redraw();
    scene.add.existing(this);
  }

  setSelected(active: boolean): this {
    this.chipActive = active;
    this.redraw();
    return this;
  }

  private redraw(): void {
    const r = 12;
    this.gfx.clear();
    this.gfx.fillStyle(this.chipActive ? HEX.buttonFillDown : HEX.buttonFill, 1);
    this.gfx.lineStyle(
      this.chipActive ? 3 : 2,
      this.chipActive ? HEX.selected : HEX.panelBorder,
      1
    );
    this.gfx.fillRoundedRect(-this.chipW / 2, -this.chipH / 2, this.chipW, this.chipH, r);
    this.gfx.strokeRoundedRect(-this.chipW / 2, -this.chipH / 2, this.chipW, this.chipH, r);
  }
}

/**
 * Bottom build palette: one chip per buildable structure plus a Remove toggle.
 * Tapping a chip selects it (toggling off if tapped again) and notifies the
 * scene via `onChange`. Follows the drawn-fallback style of {@link Button}.
 */
export class BuildMenu {
  private selection: BuildSelection = { mode: 'none' };
  private readonly chips = new Map<string, MenuChip>();

  constructor(scene: Phaser.Scene, config: BuildMenuConfig) {
    const ids = [...BUILDABLE, 'remove'];
    const count = ids.length;
    const gap = 12;
    const totalW = 680;
    const chipW = (totalW - gap * (count - 1)) / count;
    const chipH = 80;
    const startX = config.x - totalW / 2 + chipW / 2;

    ids.forEach((id, i) => {
      const cx = startX + i * (chipW + gap);
      const isRemove = id === 'remove';
      const def = isRemove ? undefined : getStructure(id);
      const title = isRemove ? 'Remove' : (def?.name ?? id);
      const sub = isRemove ? 'refund' : `${def?.cost ?? 0}`;
      const chip = new MenuChip(scene, cx, config.y, chipW, chipH, title, sub, () =>
        this.toggle(id, config.onChange)
      );
      this.chips.set(id, chip);
    });
  }

  private toggle(id: string, onChange: (s: BuildSelection) => void): void {
    const next: BuildSelection =
      id === 'remove' ? { mode: 'remove' } : { mode: 'build', defId: id };
    // Tapping the active chip clears the selection.
    if (this.isActive(id)) {
      this.selection = { mode: 'none' };
    } else {
      this.selection = next;
    }
    this.refreshActive();
    onChange(this.selection);
  }

  private isActive(id: string): boolean {
    if (id === 'remove') return this.selection.mode === 'remove';
    return this.selection.mode === 'build' && this.selection.defId === id;
  }

  private refreshActive(): void {
    for (const [id, chip] of this.chips) {
      chip.setSelected(this.isActive(id));
    }
  }

  getSelection(): BuildSelection {
    return this.selection;
  }
}
