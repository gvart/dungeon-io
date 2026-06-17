import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../main';

/**
 * Placeholder boot scene for Phase 0 — proves the engine, build, and
 * GitHub Pages deploy all work. Replaced by the real Boot → Preload →
 * MainMenu flow in Phase 1 (see ROADMAP.md).
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    this.add
      .text(cx, cy - 40, 'dungeon-io', {
        fontFamily: 'sans-serif',
        fontSize: '64px',
        color: '#f4d35e',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(cx, cy + 40, 'hello dungeon', {
        fontFamily: 'sans-serif',
        fontSize: '32px',
        color: '#9aa5b1',
      })
      .setOrigin(0.5);

    this.add
      .text(cx, GAME_HEIGHT - 80, 'Phase 0 — scaffold', {
        fontFamily: 'sans-serif',
        fontSize: '24px',
        color: '#5c6773',
      })
      .setOrigin(0.5);
  }
}
