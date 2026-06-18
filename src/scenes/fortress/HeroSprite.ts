import Phaser from 'phaser';
import { ANIM, COLORS, FONT_FAMILY, HEX, TEX } from '../../ui/theme';
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

/** Distinct tints so heroes read apart at a glance (picked by hero id). */
const HERO_TINTS = [0xffffff, 0x9ad0ff, 0xffd28a, 0xb6f0a8, 0xf6a8c0, 0xd0b8ff];

/** True while the hero is stepping along a path (drives the walk animation). */
function isMoving(hero: Hero): boolean {
  const t = hero.task;
  return !!(t.path && t.path.length > 1 && t.stepFrac);
}

/**
 * A hero pawn rendered on the (pannable) map layer. Uses the animated character
 * spritesheet when it's loaded, and falls back to a drawn disc + initial when the
 * art is absent (mirrors how structures fall back to drawn shapes). The scene
 * positions it from the task tick (interpolated for smooth walking) and toggles
 * its selection ring.
 */
export class HeroSprite extends Phaser.GameObjects.Container {
  private readonly ring: Phaser.GameObjects.Graphics;
  private readonly glyph: Phaser.GameObjects.Text;
  /** Animated pawn (present when the spritesheet loaded). */
  private readonly pawn?: Phaser.GameObjects.Sprite;
  /** Drawn fallback when there's no art. */
  private readonly disc?: Phaser.GameObjects.Graphics;
  readonly heroId: string;
  private lastX = 0;
  private moving = false;

  constructor(scene: Phaser.Scene, hero: Hero, radius: number) {
    super(scene, 0, 0);
    this.heroId = hero.id;

    this.ring = scene.add.graphics();
    this.ring.lineStyle(4, HEX.selected, 1);
    this.ring.strokeCircle(0, 0, radius + 5);
    this.ring.setVisible(false);
    this.add(this.ring);

    if (scene.textures.exists(TEX.heroSheet)) {
      this.pawn = scene.add
        .sprite(0, 0, TEX.heroSheet)
        .setOrigin(0.5)
        .setScale((radius * 2) / 16)
        .setTint(HERO_TINTS[this.tintIndex(hero.id)]);
      this.pawn.play(ANIM.heroIdle);
      this.add(this.pawn);
      // Gentle idle bob so a standing pawn still feels alive.
      scene.tweens.add({
        targets: this.pawn,
        y: -3,
        duration: 520,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
    } else {
      this.disc = scene.add.graphics();
      this.disc.fillStyle(0x4ad6c8, 1);
      this.disc.lineStyle(3, HEX.bg, 1);
      this.disc.fillCircle(0, 0, radius);
      this.disc.strokeCircle(0, 0, radius);
      this.add(this.disc);

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

  private tintIndex(id: string): number {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return h % HERO_TINTS.length;
  }

  /** Move the pawn to a pixel position and refresh its animation/selection. */
  sync(x: number, y: number, hero: Hero, selected: boolean): void {
    this.setPosition(x, y);
    this.ring.setVisible(selected);
    this.glyph.setText(TASK_GLYPH[hero.task.kind] ?? '');

    if (this.pawn) {
      const moving = isMoving(hero);
      if (moving !== this.moving) {
        this.moving = moving;
        this.pawn.play(moving ? ANIM.heroWalk : ANIM.heroIdle, true);
      }
      // Face travel direction (sprites are authored facing right by convention).
      const dx = x - this.lastX;
      if (Math.abs(dx) > 0.5) this.pawn.setFlipX(dx < 0);
    }
    this.lastX = x;
  }
}
