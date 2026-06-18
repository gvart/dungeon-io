import Phaser from 'phaser';
import { BootScene } from './scenes/Boot';
import { PreloadScene } from './scenes/Preload';
import { MainMenuScene } from './scenes/MainMenu';
import { FortressScene } from './scenes/Fortress';
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
    parent: 'game',
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    expandParent: true,
  },
  // Pixel-art friendly defaults; flip to false later if using smooth art.
  pixelArt: false,
  scene: [BootScene, PreloadScene, MainMenuScene, FortressScene, DungeonScene, ResultsScene],
};

// Boot only when the real mount point exists. This keeps unit tests safe: they
// import scenes for their GAME_WIDTH/HEIGHT constants (which evaluates this
// module) and boot their own headless game, without a stray game booting here.
if (typeof document !== 'undefined' && document.getElementById('game')) {
  const game = new Phaser.Game(config);
  // Mobile browsers settle their viewport (address bar) after load; refresh the
  // Scale Manager so the canvas bounds used for input mapping aren't stale.
  game.events.once(Phaser.Core.Events.READY, () => {
    const refresh = () => game.scale.refresh();
    setTimeout(refresh, 250);
    window.addEventListener('orientationchange', () => setTimeout(refresh, 100));
    window.addEventListener('pageshow', refresh);
  });
}
