// @vitest-environment jsdom
import './phaserHeadless';
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/**
 * Regression guard for "merged app loads to a blank page".
 *
 * The unit suite imports modules through Vite's dev transform, which resolves
 * circular imports with lazy getter bindings and so never reproduced the
 * temporal-dead-zone crash that a real Rollup bundle hits (a scene/UI module
 * read `GAME_HEIGHT` at module-eval time, before `main.ts` initialized it).
 *
 * This test imports the **built bundle** instead, with no `#game` mount point —
 * so no Phaser.Game boots, but every scene/UI module still evaluates, which is
 * exactly where the crash occurred. Requires a prior `npm run build`; if there's
 * no bundle the test is skipped (it runs in CI after the build step).
 */
const distAssets = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist/assets');
const bundle =
  fs.existsSync(distAssets) && fs.readdirSync(distAssets).find((f) => f.endsWith('.js'));

describe.skipIf(!bundle)('production bundle', () => {
  it('evaluates without a module-init crash (GAME_HEIGHT circular-import TDZ)', async () => {
    // No mount point → Phaser.Game is not constructed, isolating module evaluation.
    document.getElementById('game')?.remove();
    const url = pathToFileURL(path.join(distAssets, bundle as string)).href;
    await expect(import(/* @vite-ignore */ url)).resolves.toBeDefined();
  }, 20000);
});
