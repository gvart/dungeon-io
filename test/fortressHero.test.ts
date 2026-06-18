// @vitest-environment jsdom
import './phaserHeadless';
import { describe, it, expect } from 'vitest';
import Phaser from 'phaser';
import { FortressScene } from '../src/scenes/Fortress';
import { GAME_HEIGHT, GAME_WIDTH } from '../src/dimensions';
import { isWalkable } from '../src/systems/pathfind';
import { commandMove } from '../src/systems/task';
import type { FortressState } from '../src/systems/grid';
import type { HeroWorld } from '../src/systems/heroSave';
import type { TerrainType } from '../src/systems/terrain';

/**
 * Boots the real FortressScene headlessly to exercise the hero/garrison layer
 * wired into Phaser: a starter roster spawns on walkable cells, and the fixed
 * simulation tick (driven from the scene's update loop) walks a commanded hero
 * to its destination.
 */

interface FortressInternals {
  state: FortressState;
  terrain: TerrainType[];
  heroWorld: HeroWorld;
}

function bootFortress(): Promise<Phaser.Game> {
  // Fresh storage so we always get the starter roster.
  try {
    localStorage.clear();
  } catch {
    // ignore
  }
  return new Promise((resolve) => {
    const game = new Phaser.Game({
      type: Phaser.HEADLESS,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      audio: { noAudio: true },
      banner: false,
      scene: [FortressScene],
      callbacks: { postBoot: () => resolve(game) },
    });
  });
}

function pump(game: Phaser.Game, ms: number): Promise<void> {
  return new Promise((resolve) => {
    let t = 0;
    const id = setInterval(() => {
      t += 16;
      try {
        game.step(t, 16);
      } catch {
        // HEADLESS has no renderer; ignore the post-update render throw.
      }
      if (t >= ms) {
        clearInterval(id);
        resolve();
      }
    }, 0);
  });
}

function internals(game: Phaser.Game): FortressInternals {
  return game.scene.getScene('Fortress') as unknown as FortressInternals;
}

describe('Fortress hero layer', () => {
  it('spawns a starter roster on walkable cells', async () => {
    const game = await bootFortress();
    await pump(game, 400);
    const f = internals(game);
    expect(f.heroWorld.heroes.length).toBe(3);
    for (const hero of f.heroWorld.heroes) {
      expect(isWalkable(f.state, f.terrain, hero.col, hero.row)).toBe(true);
    }
    game.destroy(true);
  }, 15000);

  it('walks a commanded hero to its destination via the sim tick', async () => {
    const game = await bootFortress();
    await pump(game, 400);
    const f = internals(game);
    const hero = f.heroWorld.heroes[0];

    // Find a nearby reachable target a few cells away.
    let target: { col: number; row: number } | null = null;
    for (let d = 3; d <= 6 && !target; d++) {
      for (const [dc, dr] of [
        [d, 0],
        [0, d],
        [-d, 0],
        [0, -d],
      ]) {
        const col = hero.col + dc;
        const row = hero.row + dr;
        if (commandMove(f.state, f.terrain, hero, col, row)) {
          target = { col, row };
          break;
        }
      }
    }
    expect(target).not.toBeNull();

    await pump(game, 6000);
    expect(hero.col).toBe(target!.col);
    expect(hero.row).toBe(target!.row);
    expect(hero.task.kind).toBe('idle');
    game.destroy(true);
  }, 20000);
});
