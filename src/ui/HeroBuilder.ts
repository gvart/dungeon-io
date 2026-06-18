import Phaser from 'phaser';
import { COLORS, FONT, FONT_FAMILY, HEX } from './theme';
import { Chip } from './Chip';
import { makeButton, type Button } from './Button';
import {
  ATTR_BASELINE,
  ATTR_MAX,
  ATTR_POINTS_START,
  ATTRIBUTE_ORDER,
  ATTRIBUTES,
  type Attributes,
} from '../data/attributes';
import { baselineAttributes, pointsSpent } from '../systems/hero';

export interface HeroBuilderConfig {
  /** Resource cost to create a hero (shown on the confirm control). */
  cost: number;
  onConfirm: (name: string, attr: Attributes) => void;
  onCancel: () => void;
}

const NAME_POOL = ['Aldric', 'Bryn', 'Cael', 'Dara', 'Eira', 'Finn', 'Gwen', 'Hale'];

/**
 * Full-screen overlay for creating a freeform hero: cycle a name, allocate the
 * attribute point pool with +/- chips, then confirm (gated by remaining points
 * and resources). Lives in the scene's fixed UI layer.
 */
export class HeroBuilder {
  readonly root: Phaser.GameObjects.Container;
  private readonly attr: Attributes = baselineAttributes();
  private nameIndex = 0;
  private affordable = true;
  private readonly nameText: Phaser.GameObjects.Text;
  private readonly pointsText: Phaser.GameObjects.Text;
  private readonly valueTexts = new Map<string, Phaser.GameObjects.Text>();
  private readonly plusChips = new Map<string, Chip>();
  private readonly minusChips = new Map<string, Chip>();
  private readonly confirm: Button;
  private readonly cost: number;
  private opened = false;

  constructor(scene: Phaser.Scene, cfg: HeroBuilderConfig) {
    this.cost = cfg.cost;
    this.root = scene.add.container(0, 0).setVisible(false).setDepth(50);

    const w = scene.scale.width;
    const h = scene.scale.height;
    const scrim = scene.add.graphics();
    scrim.fillStyle(HEX.bg, 0.85);
    scrim.fillRect(0, 0, w, h);
    this.root.add(scrim);

    const px = 40;
    const pw = w - px * 2;
    const top = 180;
    const ph = 860;
    const panel = scene.add.graphics();
    panel.fillStyle(HEX.panel, 1);
    panel.lineStyle(2, HEX.panelBorder, 1);
    panel.fillRoundedRect(px, top, pw, ph, 20);
    panel.strokeRoundedRect(px, top, pw, ph, 20);
    this.root.add(panel);

    this.root.add(
      scene.add
        .text(w / 2, top + 40, 'NEW HERO', {
          fontFamily: FONT_FAMILY,
          fontSize: FONT.heading,
          color: COLORS.gold,
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
    );

    // Name row with a cycle control.
    this.nameText = scene.add
      .text(w / 2 - 60, top + 110, NAME_POOL[0], {
        fontFamily: FONT_FAMILY,
        fontSize: FONT.body,
        color: COLORS.text,
      })
      .setOrigin(0.5);
    this.root.add(this.nameText);
    this.root.add(
      new Chip(scene, {
        x: w / 2 + 140,
        y: top + 110,
        w: 120,
        h: 56,
        title: 'Name ↻',
        sub: '',
        onTap: () => this.cycleName(),
      })
    );

    this.pointsText = scene.add
      .text(w / 2, top + 170, '', {
        fontFamily: FONT_FAMILY,
        fontSize: FONT.body,
        color: COLORS.gold,
      })
      .setOrigin(0.5);
    this.root.add(this.pointsText);

    // Attribute rows.
    const rowTop = top + 230;
    const rowGap = 110;
    ATTRIBUTE_ORDER.forEach((key, i) => {
      const y = rowTop + i * rowGap;
      const def = ATTRIBUTES[key];
      this.root.add(
        scene.add
          .text(px + 40, y, def.name, {
            fontFamily: FONT_FAMILY,
            fontSize: FONT.body,
            color: COLORS.text,
          })
          .setOrigin(0, 0.5)
      );
      const minus = new Chip(scene, {
        x: w / 2 + 40,
        y,
        w: 64,
        h: 64,
        title: '−',
        sub: '',
        onTap: () => this.bump(key, -1),
      });
      const value = scene.add
        .text(w / 2 + 140, y, '', {
          fontFamily: FONT_FAMILY,
          fontSize: FONT.heading,
          color: COLORS.gold,
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      const plus = new Chip(scene, {
        x: w / 2 + 240,
        y,
        w: 64,
        h: 64,
        title: '+',
        sub: '',
        onTap: () => this.bump(key, 1),
      });
      this.minusChips.set(key, minus);
      this.plusChips.set(key, plus);
      this.valueTexts.set(key, value);
      this.root.add([minus, value, plus]);
    });

    this.confirm = makeButton(scene, {
      x: w / 2 + 130,
      y: top + ph - 60,
      label: 'Create',
      variant: 'primary',
      width: 280,
      height: 84,
      onClick: () => {
        if (this.affordable) cfg.onConfirm(NAME_POOL[this.nameIndex], { ...this.attr });
      },
    });
    this.root.add(this.confirm);
    this.root.add(
      makeButton(scene, {
        x: w / 2 - 180,
        y: top + ph - 60,
        label: 'Cancel',
        variant: 'secondary',
        width: 280,
        height: 84,
        onClick: () => cfg.onCancel(),
      })
    );

    this.refresh();
  }

  isOpen(): boolean {
    return this.opened;
  }

  open(): void {
    // Reset to a fresh allocation each time.
    for (const k of ATTRIBUTE_ORDER) this.attr[k] = ATTR_BASELINE;
    this.opened = true;
    this.root.setVisible(true);
    this.refresh();
  }

  close(): void {
    this.opened = false;
    this.root.setVisible(false);
  }

  /** Tell the builder whether the player can currently afford a hero. */
  setAffordable(affordable: boolean): void {
    this.affordable = affordable;
    this.refresh();
  }

  private cycleName(): void {
    this.nameIndex = (this.nameIndex + 1) % NAME_POOL.length;
    this.nameText.setText(NAME_POOL[this.nameIndex]);
  }

  private bump(key: string, delta: number): void {
    const k = key as keyof Attributes;
    const next = this.attr[k] + delta;
    const remaining = ATTR_POINTS_START - pointsSpent(this.attr);
    if (delta > 0 && (remaining <= 0 || next > ATTR_MAX)) return;
    if (delta < 0 && next < ATTR_BASELINE) return;
    this.attr[k] = next;
    this.refresh();
  }

  private refresh(): void {
    const remaining = ATTR_POINTS_START - pointsSpent(this.attr);
    this.pointsText.setText(`Points left: ${remaining}    Cost: ${this.cost}`);
    for (const k of ATTRIBUTE_ORDER) {
      this.valueTexts.get(k)!.setText(`${this.attr[k]}`);
      this.minusChips.get(k)!.setEnabled(this.attr[k] > ATTR_BASELINE);
      this.plusChips.get(k)!.setEnabled(remaining > 0 && this.attr[k] < ATTR_MAX);
    }
    this.confirm.setAlpha(this.affordable ? 1 : 0.45);
  }
}
