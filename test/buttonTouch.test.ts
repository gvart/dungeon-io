// @vitest-environment jsdom
import './phaserHeadless';
import { describe, it, expect } from 'vitest';
import Phaser from 'phaser';
import { MainMenuScene } from '../src/scenes/MainMenu';
import { FortressScene } from '../src/scenes/Fortress';
import { Button } from '../src/ui/Button';
import { GAME_HEIGHT, GAME_WIDTH } from '../src/main';

/**
 * Regression test for the "press Play, nothing happens" bug: on a touch screen a
 * tap usually emits a stray `pointerout` between `pointerdown` and `pointerup`,
 * which used to swallow the click. These tests boot the real scenes headlessly
 * and drive the Play button to assert navigation still happens.
 */

function bootGame(): Promise<Phaser.Game> {
  return new Promise((resolve) => {
    const game = new Phaser.Game({
      type: Phaser.HEADLESS,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      audio: { noAudio: true },
      banner: false,
      scene: [MainMenuScene, FortressScene],
      callbacks: { postBoot: () => resolve(game) },
    });
  });
}

/** Advance the game loop by ~`ms`, ignoring the HEADLESS no-renderer throw. */
function pump(game: Phaser.Game, ms: number): Promise<void> {
  return new Promise((resolve) => {
    let t = 0;
    const id = setInterval(() => {
      t += 16;
      try {
        game.step(t, 16);
      } catch {
        // HEADLESS has no renderer; the post-update render step throws after the
        // scene/camera update already ran. Safe to ignore for these tests.
      }
      if (t >= ms) {
        clearInterval(id);
        resolve();
      }
    }, 0);
  });
}

function playButton(game: Phaser.Game): Button {
  const menu = game.scene.getScene('MainMenu');
  const btn = menu.children.list.find((c) => c instanceof Button) as Button | undefined;
  if (!btn) throw new Error('Play button not found on MainMenu');
  return btn;
}

describe('Play button navigation (touch)', () => {
  it('navigates MainMenu -> Fortress on a clean tap', async () => {
    const game = await bootGame();
    await pump(game, 400);
    const btn = playButton(game);

    btn.emit('pointerdown');
    btn.emit('pointerup');
    await pump(game, 600);

    expect(game.scene.isActive('Fortress')).toBe(true);
    game.destroy(true);
  }, 15000);

  it('navigates even when a stray pointerout fires mid-tap', async () => {
    const game = await bootGame();
    await pump(game, 400);
    const btn = playButton(game);

    btn.emit('pointerdown');
    btn.emit('pointerout'); // finger jitter
    btn.emit('pointerup');
    await pump(game, 600);

    expect(game.scene.isActive('Fortress')).toBe(true);
    game.destroy(true);
  }, 15000);

  it('does not navigate when the release happens off the button', async () => {
    const game = await bootGame();
    await pump(game, 400);
    const btn = playButton(game);

    btn.emit('pointerdown');
    btn.emit('pointerout');
    btn.emit('pointerupoutside'); // released elsewhere -> cancel
    await pump(game, 400);

    expect(game.scene.isActive('Fortress')).toBe(false);
    game.destroy(true);
  }, 15000);
});
