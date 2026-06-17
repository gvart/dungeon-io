import { makeButton } from '../ui/Button';
import { BaseScene } from './BaseScene';

/** Placeholder dungeon screen (semi-auto combat arrives in Phase 3). */
export class DungeonScene extends BaseScene {
  constructor() {
    super('Dungeon');
  }

  create(): void {
    this.enter();

    this.heading('Dungeon', this.cy - 380);
    this.panel(this.cx, this.cy - 60, 560, 360);
    this.subtitle(
      'Your party fights through waves to the boss here.\n(Coming in Phase 3)',
      this.cy - 60
    );

    makeButton(this, {
      x: this.cx,
      y: this.cy + 240,
      label: 'Finish Run',
      variant: 'primary',
      onClick: () => this.goTo('Results'),
    });
    makeButton(this, {
      x: this.cx,
      y: this.cy + 360,
      label: 'Retreat',
      variant: 'secondary',
      onClick: () => this.goTo('MainMenu'),
    });
  }
}
