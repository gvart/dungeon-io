import { makeButton } from '../ui/Button';
import { BaseScene } from './BaseScene';

/** Placeholder run-results screen (rewards summary arrives in Phase 4/5). */
export class ResultsScene extends BaseScene {
  constructor() {
    super('Results');
  }

  create(): void {
    this.enter();

    this.heading('Run Complete', this.cy - 380);
    this.panel(this.cx, this.cy - 60, 560, 360);
    this.subtitle(
      'Cleared! Loot and rewards will be summarised here.\n(Coming in Phase 4/5)',
      this.cy - 60
    );

    makeButton(this, {
      x: this.cx,
      y: this.cy + 240,
      label: 'Back to Menu',
      variant: 'primary',
      onClick: () => this.goTo('MainMenu'),
    });
  }
}
