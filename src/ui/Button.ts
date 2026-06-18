import Phaser from 'phaser';
import { COLORS, FONT, FONT_FAMILY, HEX, TEX, TOUCH_MIN } from './theme';

export type ButtonVariant = 'primary' | 'secondary';
/** Drawn glyph rendered instead of a text label (no asset needed). */
export type ButtonIcon = 'back' | 'build';

export interface ButtonConfig {
  x: number;
  y: number;
  label: string;
  onClick: () => void;
  variant?: ButtonVariant;
  width?: number;
  height?: number;
  /** When set, the button shows this drawn icon centered instead of `label`. */
  icon?: ButtonIcon;
}

/**
 * Reusable, touch-friendly button.
 *
 * Renders a Kenney nine-slice background when the texture is loaded; otherwise
 * falls back to a drawn rounded rectangle. That fallback is the clean swap
 * point for art — the game builds and runs with or without the PNGs present.
 */
export class Button extends Phaser.GameObjects.Container {
  private readonly bgTex?: string;
  private readonly bgTexPressed?: string;
  private nineUp?: Phaser.GameObjects.NineSlice;
  private ninePressed?: Phaser.GameObjects.NineSlice;
  private gfx?: Phaser.GameObjects.Graphics;
  private readonly btnW: number;
  private readonly btnH: number;
  /** Armed once a press starts on this button; survives a stray pointerout. */
  private armed = false;
  /** Current pressed *visual* state (decoupled from `armed`). */
  private pressedVisual = false;
  private readonly onClick: () => void;

  constructor(scene: Phaser.Scene, config: ButtonConfig) {
    super(scene, config.x, config.y);
    this.onClick = config.onClick;

    const variant = config.variant ?? 'primary';
    this.btnW = Math.max(config.width ?? 360, TOUCH_MIN);
    this.btnH = Math.max(config.height ?? 96, TOUCH_MIN);

    if (variant === 'primary') {
      this.bgTex = TEX.btnBlue;
      this.bgTexPressed = TEX.btnBluePressed;
    } else {
      this.bgTex = TEX.btnGrey;
      this.bgTexPressed = TEX.btnGreyPressed;
    }

    const hasArt = !!this.bgTex && scene.textures.exists(this.bgTex);
    if (hasArt) {
      // buttonLong art is ~190x49 with rounded ends and a bottom "depth" edge.
      this.nineUp = scene.add.nineslice(
        0,
        0,
        this.bgTex!,
        undefined,
        this.btnW,
        this.btnH,
        16,
        16,
        8,
        12
      );
      this.ninePressed = scene.add
        .nineslice(0, 0, this.bgTexPressed!, undefined, this.btnW, this.btnH, 16, 16, 8, 12)
        .setVisible(false);
      this.add([this.nineUp, this.ninePressed]);
    } else {
      this.gfx = scene.add.graphics();
      this.add(this.gfx);
      this.drawFallback(false);
    }

    if (config.icon) {
      const icon = scene.add.graphics();
      this.drawIcon(icon, config.icon, variant === 'primary' ? HEX.bg : HEX.gold);
      this.add(icon);
    } else {
      const label = scene.add
        .text(0, hasArt ? -2 : 0, config.label, {
          fontFamily: FONT_FAMILY,
          fontSize: FONT.button,
          color: variant === 'primary' ? COLORS.bg : COLORS.text,
          fontStyle: variant === 'primary' ? 'bold' : 'normal',
        })
        .setOrigin(0.5);
      this.add(label);
    }

    this.setSize(this.btnW, this.btnH);
    this.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(-this.btnW / 2, -this.btnH / 2, this.btnW, this.btnH),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    });

    this.on('pointerover', () => {
      if (!this.armed) this.setScale(1.03);
    });
    // A tap on a touch screen frequently emits a stray pointerout between down
    // and up (finger micro-movement). Reset the visuals but stay *armed* so the
    // following pointerup still counts as a click — otherwise taps silently
    // do nothing on mobile.
    this.on('pointerout', () => {
      this.setScale(1);
      this.showPressed(false);
    });
    this.on('pointerdown', () => {
      this.armed = true;
      this.showPressed(true);
    });
    // Phaser fires `pointerup` only while the pointer is "over" the object and
    // `pointerupoutside` otherwise — but a touch tap routinely emits a stray
    // pointerout first, so the release lands as `pointerupoutside` even though
    // the finger never left the button. Resolve both the same way: if the press
    // started here and the release coordinates are inside our bounds, it's a
    // click. A genuine drag-off releases outside the bounds and is ignored.
    this.on('pointerup', (p: Phaser.Input.Pointer) => this.resolveTap(p));
    this.on('pointerupoutside', (p: Phaser.Input.Pointer) => this.resolveTap(p));

    scene.add.existing(this);
  }

  /** Settle a release: fire onClick when armed and released within bounds. */
  private resolveTap(p: Phaser.Input.Pointer): void {
    this.setScale(1);
    this.showPressed(false);
    if (!this.armed) return;
    this.armed = false;
    if (this.getBounds().contains(p.x, p.y)) this.onClick();
  }

  /** Swap to the pressed/unpressed visual (independent of the armed state). */
  private showPressed(pressed: boolean): void {
    if (this.pressedVisual === pressed) return;
    this.pressedVisual = pressed;
    if (this.nineUp && this.ninePressed) {
      this.nineUp.setVisible(!pressed);
      this.ninePressed.setVisible(pressed);
    } else {
      this.drawFallback(pressed);
    }
  }

  /** Draw a simple vector glyph centered on the button (no texture needed). */
  private drawIcon(g: Phaser.GameObjects.Graphics, icon: ButtonIcon, color: number): void {
    g.clear();
    if (icon === 'back') {
      // Left-pointing chevron arrow.
      g.lineStyle(8, color, 1);
      g.beginPath();
      g.moveTo(12, -22);
      g.lineTo(-14, 0);
      g.lineTo(12, 22);
      g.strokePath();
      g.lineBetween(-14, 0, 22, 0);
    } else {
      // Hammer: angled head + handle.
      g.fillStyle(color, 1);
      // Handle.
      g.fillRect(-4, -6, 8, 30);
      // Head.
      g.fillRoundedRect(-22, -24, 44, 16, 4);
    }
  }

  private drawFallback(pressed: boolean): void {
    if (!this.gfx) return;
    const fill = pressed ? HEX.buttonFillDown : HEX.buttonFill;
    const r = 16;
    this.gfx.clear();
    this.gfx.fillStyle(fill, 1);
    this.gfx.lineStyle(2, HEX.gold, 0.9);
    this.gfx.fillRoundedRect(-this.btnW / 2, -this.btnH / 2, this.btnW, this.btnH, r);
    this.gfx.strokeRoundedRect(-this.btnW / 2, -this.btnH / 2, this.btnW, this.btnH, r);
  }
}

/** Convenience factory mirroring scene.add.* ergonomics. */
export function makeButton(scene: Phaser.Scene, config: ButtonConfig): Button {
  return new Button(scene, config);
}
