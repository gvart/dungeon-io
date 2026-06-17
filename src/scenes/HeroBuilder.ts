import { makeButton } from '../ui/Button';
import { BaseScene } from './BaseScene';

/** Placeholder hero-building screen (real content arrives in Phase 2). */
export class HeroBuilderScene extends BaseScene {
  constructor() {
    super('HeroBuilder');
  }

  create(): void {
    this.enter();

    this.heading('Hero Builder', this.cy - 380);
    this.panel(this.cx, this.cy - 60, 560, 360);
    this.subtitle(
      'Assign attributes and pick a skill loadout here.\n(Coming in Phase 2)',
      this.cy - 60
    );

    makeButton(this, {
      x: this.cx,
      y: this.cy + 240,
      label: 'Enter Dungeon',
      variant: 'primary',
      onClick: () => this.goTo('Dungeon'),
    });
    makeButton(this, {
      x: this.cx,
      y: this.cy + 360,
      label: 'Back',
      variant: 'secondary',
      onClick: () => this.goTo('MainMenu'),
    });
  }
}
