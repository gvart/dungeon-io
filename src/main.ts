import Phaser from 'phaser';
import { BootScene } from './scenes/Boot';
import { PreloadScene } from './scenes/Preload';
import { MainMenuScene } from './scenes/MainMenu';
import { HeroBuilderScene } from './scenes/HeroBuilder';
import { DungeonScene } from './scenes/Dungeon';
import { ResultsScene } from './scenes/Results';

// Portrait design resolution. The Scale Manager FITs this into the device
// viewport, so we author against a fixed canvas and let Phaser letterbox.
export const GAME_WIDTH = 720;
export const GAME_HEIGHT = 1280;

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0b0e14',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  },
  // Pixel-art friendly defaults; flip to false later if using smooth art.
  pixelArt: false,
  scene: [BootScene, PreloadScene, MainMenuScene, HeroBuilderScene, DungeonScene, ResultsScene],
};

new Phaser.Game(config);
