import Phaser from 'phaser';
import { COLORS, FONT_FAMILY, HEX, TEX } from '../../ui/theme';
import type { Hero } from '../../systems/hero';
import type { TaskKind } from '../../systems/task';

/**
 * Short ASCII glyph shown under a working hero. Plain letters so they render in
 * any font (the bundled "Kenney Future" lacks many symbol glyphs).
 */
const TASK_GLYPH: Record<TaskKind, string> = {
  idle: '',
  move: 'M',
  guard: 'G',
  assistBuild: 'B',
  gather: 'H',
};

/** True while the hero is stepping along a path (drives the faster hop). */
function isMoving(hero: Hero): boolean {
  const t = hero.task;
  return !!(t.path && t.path.length > 1 && t.stepFrac);
}

/**
 * A hero pawn rendered on the (pannable) map layer. Uses a distinct character
 * tile from the roguelike spritesheet when it's loaded (each hero gets a unique
 * frame via {@link HeroAppearances}), and falls back to a drawn disc + initial
 * when the art is absent (mirrors how structures fall back to drawn shapes).
 *
 * The pack's characters are single static tiles, so liveliness comes from a
 * vertical hop tween — gentle when idle, quicker while walking — rather than
 * frame animation. The scene positions the pawn from the task tick (interpolated
 * for smooth walking) and toggles its selection ring.
 */
export class HeroSprite extends Phaser.GameObjects.Container {
  private readonly ring: Phaser.GameObjects.Graphics;
  private readonly glyph: Phaser.GameObjects.Text;
  /** Character tile (present when the spritesheet loaded). */
  private readonly pawn?: Phaser.GameObjects.Sprite;
  private hop?: Phaser.Tweens.Tween;
  readonly heroId: string;
  private lastX = 0;
  private moving = false;

  constructor(scene: Phaser.Scene, hero: Hero, radius: number, frame: number) {
    super(scene, 0, 0);
    this.heroId = hero.id;

    this.ring = scene.add.graphics();
    this.ring.lineStyle(4, HEX.selected, 1);
    this.ring.strokeCircle(0, 0, radius + 5);
    this.ring.setVisible(false);
    this.add(this.ring);

    if (scene.textures.exists(TEX.heroSheet)) {
      this.pawn = scene.add
        .sprite(0, 0, TEX.heroSheet, frame)
        .setOrigin(0.5)
        .setScale((radius * 2) / 16);
      this.add(this.pawn);
      this.setHop(false);
    } else {
      const disc = scene.add.graphics();
      disc.fillStyle(0x4ad6c8, 1);
      disc.lineStyle(3, HEX.bg, 1);
      disc.fillCircle(0, 0, radius);
      disc.strokeCircle(0, 0, radius);
      this.add(disc);

      const initial = scene.add
        .text(0, 0, hero.name.charAt(0).toUpperCase(), {
          fontFamily: FONT_FAMILY,
          fontSize: '22px',
          color: COLORS.bg,
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      this.add(initial);
    }

    this.glyph = scene.add
      .text(0, radius + 12, '', {
        fontFamily: FONT_FAMILY,
        fontSize: '18px',
        color: COLORS.gold,
      })
      .setOrigin(0.5);
    this.add(this.glyph);

    this.setDepth(15);
    scene.add.existing(this);
  }

  /** (Re)start the vertical hop — a quicker, taller hop while walking. */
  private setHop(moving: boolean): void {
    if (!this.pawn) return;
    this.hop?.remove();
    this.pawn.y = 0;
    this.hop = this.scene.tweens.add({
      targets: this.pawn,
      y: moving ? -6 : -2,
      duration: moving ? 240 : 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
  }

  /** Move the pawn to a pixel position and refresh its hop/facing/selection. */
  sync(x: number, y: number, hero: Hero, selected: boolean): void {
    this.setPosition(x, y);
    this.ring.setVisible(selected);
    this.glyph.setText(TASK_GLYPH[hero.task.kind] ?? '');

    if (this.pawn) {
      const moving = isMoving(hero);
      if (moving !== this.moving) {
        this.moving = moving;
        this.setHop(moving);
      }
      // Face travel direction (sprites are authored facing the viewer).
      const dx = x - this.lastX;
      if (Math.abs(dx) > 0.5) this.pawn.setFlipX(dx < 0);
    }
    this.lastX = x;
  }
}
