import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../main';
import { COLORS, FONT, FONT_FAMILY } from '../ui/theme';
import { makeButton } from '../ui/Button';
import { BaseScene } from './BaseScene';

/** Title screen. Entry point of the gameplay loop. */
export class MainMenuScene extends BaseScene {
  constructor() {
    super('MainMenu');
  }

  create(): void {
    this.enter();

    this.heading('FORTGION', this.cy - 340, FONT.title);
    this.subtitle('Build your fortress. Outlast the raids.', this.cy - 250);

    // Temporary on-screen input probe (no devtools on a phone). Shows whether
    // taps reach Phaser and at what game-space coordinates.
    const probe = this.add
      .text(this.cx, 70, 'tap Play…', {
        fontFamily: FONT_FAMILY,
        fontSize: FONT.small,
        color: COLORS.dim,
        align: 'center',
        wordWrap: { width: GAME_WIDTH - 40 },
      })
      .setOrigin(0.5);

    const playW = 360;
    const playH = 96;
    makeButton(this, {
      x: this.cx,
      y: this.cy,
      label: 'Play',
      variant: 'primary',
      width: playW,
      height: playH,
      onClick: () => this.goTo('Fortress'),
    });

    // Robust, coordinate-based fallback: navigate when a tap/click lands on the
    // Play button area, independent of per-object hit-testing (which can fail to
    // receive pointers on some mobile setups). Also drives the debug probe.
    const within = (p: Phaser.Input.Pointer): boolean =>
      Math.abs(p.x - this.cx) <= playW / 2 && Math.abs(p.y - this.cy) <= playH / 2;

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      probe.setText(`down ${p.x | 0},${p.y | 0}  hit:${within(p) ? 'Y' : 'N'}`);
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      const hit = within(p);
      const ds = this.scale.displayScale;
      probe.setText(
        `up ${p.x | 0},${p.y | 0} hit:${hit ? 'Y' : 'N'} ds:${ds.x.toFixed(2)},${ds.y.toFixed(2)}`
      );
      if (hit) this.goTo('Fortress');
    });

    this.add
      .text(this.cx, GAME_HEIGHT - 60, 'Phase 2 — fortress & build mode', {
        fontFamily: 'sans-serif',
        fontSize: FONT.small,
        color: '#5c6773',
      })
      .setOrigin(0.5);
  }
}
