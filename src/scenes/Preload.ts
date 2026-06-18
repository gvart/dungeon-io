import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../main';
import { ANIM, COLORS, FONT, FONT_FAMILY, HEX, TEX, TERRAIN_FILES } from '../ui/theme';
import { STRUCTURES } from '../data/structures';

const UI = 'assets/ui';
const STRUCT = 'assets/structures';
const TILES = 'assets/tiles';
const CHARS = 'assets/characters';

/**
 * Loads UI art + waits for the bundled font, showing a simple progress bar.
 * Asset files are loaded by path; if any are missing the loader logs an error
 * and the UI falls back to drawn shapes, so the game still runs.
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload(): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    this.add
      .text(cx, cy - 80, 'dungeon-io', {
        fontFamily: FONT_FAMILY,
        fontSize: FONT.title,
        color: COLORS.gold,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const barW = 440;
    const barH = 28;
    const frame = this.add.graphics();
    frame.lineStyle(2, HEX.panelBorder, 1);
    frame.strokeRoundedRect(cx - barW / 2, cy - barH / 2, barW, barH, 8);
    const fill = this.add.graphics();

    this.load.on('progress', (p: number) => {
      fill.clear();
      fill.fillStyle(HEX.gold, 1);
      fill.fillRoundedRect(cx - barW / 2 + 4, cy - barH / 2 + 4, (barW - 8) * p, barH - 8, 6);
    });

    // Missing files emit loaderror; swallow it so the scene still completes.
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.warn(`[Preload] missing asset "${file.key}" — using fallback art`);
    });

    this.load.image(TEX.btnBlue, `${UI}/button_long_blue.png`);
    this.load.image(TEX.btnBluePressed, `${UI}/button_long_blue_pressed.png`);
    this.load.image(TEX.btnGrey, `${UI}/button_long_grey.png`);
    this.load.image(TEX.btnGreyPressed, `${UI}/button_long_grey_pressed.png`);
    this.load.image(TEX.panel, `${UI}/panel_brown.png`);

    // Fortress structure tiles. Each def's `texKey` maps to a PNG named after the
    // key's suffix (e.g. 'struct-wall' -> assets/structures/wall.png). Files are
    // optional: a missing one triggers loaderror above and the Fortress scene
    // draws its colored-shape fallback instead, so the game still runs.
    for (const def of Object.values(STRUCTURES)) {
      if (!def.texKey) continue;
      const file = def.texKey.replace(/^struct-/, '');
      this.load.image(def.texKey, `${STRUCT}/${file}.png`);
    }

    // Terrain tiles for the procedurally-generated map. Missing files fall back
    // to flat terrain colors (see loaderror handler above).
    for (const [key, file] of Object.entries(TERRAIN_FILES)) {
      this.load.image(key, `${TILES}/${file}`);
    }

    // Hero pawn spritesheet (Kenney "Roguelike Characters", CC0 — 16×16 tiles
    // with 1px spacing). Optional: if absent, the loaderror handler fires and
    // HeroSprite draws its colored-disc fallback instead.
    this.load.spritesheet(TEX.heroSheet, `${CHARS}/heroes.png`, {
      frameWidth: 16,
      frameHeight: 16,
      margin: 0,
      spacing: 1,
    });
  }

  async create(): Promise<void> {
    this.buildHeroAnims();
    // Ensure the webfont is ready before the menu renders text with it.
    try {
      await document.fonts.load(`16px ${FONT_FAMILY}`);
      await document.fonts.ready;
    } catch {
      // Font API unavailable or load failed — system fallback is fine.
    }
    this.scene.start('MainMenu');
  }

  /** Build hero idle/walk animations when the spritesheet loaded (else skip). */
  private buildHeroAnims(): void {
    if (!this.textures.exists(TEX.heroSheet)) return;
    // Crisp upscale from 16px source to the on-map pawn size.
    this.textures.get(TEX.heroSheet).setFilter(Phaser.Textures.FilterMode.NEAREST);

    const total = this.textures.get(TEX.heroSheet).frameTotal;
    const last = Math.max(0, Math.min(1, total - 1));
    this.anims.create({
      key: ANIM.heroIdle,
      frames: [{ key: TEX.heroSheet, frame: 0 }],
      frameRate: 1,
      repeat: -1,
    });
    this.anims.create({
      key: ANIM.heroWalk,
      frames: this.anims.generateFrameNumbers(TEX.heroSheet, { start: 0, end: last }),
      frameRate: 6,
      repeat: -1,
    });
  }
}
