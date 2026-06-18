import { GAME_HEIGHT } from '../main';
import { FONT } from '../ui/theme';
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

    makeButton(this, {
      x: this.cx,
      y: this.cy,
      label: 'Play',
      variant: 'primary',
      width: 360,
      height: 96,
      onClick: () => this.goTo('Fortress'),
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
