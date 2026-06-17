import Phaser from 'phaser';

/**
 * Boot is the first scene: it does minimal, synchronous setup and immediately
 * hands off to Preload, which loads assets and shows a progress bar. The real
 * UI begins at MainMenu (see ROADMAP.md Phase 1).
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    this.scene.start('Preload');
  }
}
