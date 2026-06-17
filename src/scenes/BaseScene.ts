import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../main';
import { COLORS, FONT, FONT_FAMILY, HEX, TEX } from '../ui/theme';

/**
 * Shared base for gameplay-shell scenes. Provides a consistent background, a
 * fade-in on entry, and a `goTo` helper that fades out before switching scenes
 * so navigation feels smooth on mobile.
 */
export abstract class BaseScene extends Phaser.Scene {
  protected readonly cx = GAME_WIDTH / 2;
  protected readonly cy = GAME_HEIGHT / 2;

  /** Call from each scene's create() first. */
  protected enter(): void {
    this.cameras.main.setBackgroundColor(HEX.bg);
    this.cameras.main.fadeIn(220, 11, 14, 20);
  }

  /** Fade out, then start the target scene. */
  protected goTo(key: string): void {
    this.input.enabled = false;
    this.cameras.main.fadeOut(180, 11, 14, 20);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(key);
    });
  }

  /** Centered heading text using the theme font. */
  protected heading(text: string, y: number, size: string = FONT.heading): Phaser.GameObjects.Text {
    return this.add
      .text(this.cx, y, text, {
        fontFamily: FONT_FAMILY,
        fontSize: size,
        color: COLORS.gold,
        fontStyle: 'bold',
        align: 'center',
      })
      .setOrigin(0.5);
  }

  /** Muted body/subtitle text. */
  protected subtitle(text: string, y: number): Phaser.GameObjects.Text {
    return this.add
      .text(this.cx, y, text, {
        fontFamily: FONT_FAMILY,
        fontSize: FONT.body,
        color: COLORS.muted,
        align: 'center',
        wordWrap: { width: GAME_WIDTH - 120 },
      })
      .setOrigin(0.5);
  }

  /**
   * Optional decorative content panel behind placeholder text. Uses the Kenney
   * nine-slice panel when present, else a drawn rounded rect.
   */
  protected panel(x: number, y: number, w: number, h: number): void {
    if (this.textures.exists(TEX.panel)) {
      this.add.nineslice(x, y, TEX.panel, undefined, w, h, 32, 32, 32, 32);
    } else {
      const g = this.add.graphics();
      g.fillStyle(HEX.panel, 0.9);
      g.lineStyle(2, HEX.panelBorder, 1);
      g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 18);
      g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 18);
    }
  }
}
