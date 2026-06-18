import Phaser from 'phaser';
import { COLORS, FONT_FAMILY, HEX } from '../../ui/theme';
import type { Hero } from '../../systems/hero';
import type { TaskKind } from '../../systems/task';

/** Short glyph shown under a working hero. */
const TASK_GLYPH: Record<TaskKind, string> = {
  idle: '',
  move: '→',
  guard: '⚑',
  assistBuild: '⚒',
  gather: '⛏',
};

/**
 * A hero pawn rendered on the (pannable) map layer. Drawn with Graphics + text
 * so it works with no art (mirrors how structures fall back to drawn shapes). The
 * scene positions it from the task tick (interpolated for smooth walking) and
 * toggles its selection ring.
 */
export class HeroSprite extends Phaser.GameObjects.Container {
  private readonly disc: Phaser.GameObjects.Graphics;
  private readonly ring: Phaser.GameObjects.Graphics;
  private readonly initial: Phaser.GameObjects.Text;
  private readonly glyph: Phaser.GameObjects.Text;
  readonly heroId: string;

  constructor(scene: Phaser.Scene, hero: Hero, radius: number) {
    super(scene, 0, 0);
    this.heroId = hero.id;

    this.ring = scene.add.graphics();
    this.ring.lineStyle(4, HEX.selected, 1);
    this.ring.strokeCircle(0, 0, radius + 5);
    this.ring.setVisible(false);
    this.add(this.ring);

    this.disc = scene.add.graphics();
    this.disc.fillStyle(0x4ad6c8, 1);
    this.disc.lineStyle(3, HEX.bg, 1);
    this.disc.fillCircle(0, 0, radius);
    this.disc.strokeCircle(0, 0, radius);
    this.add(this.disc);

    this.initial = scene.add
      .text(0, 0, hero.name.charAt(0).toUpperCase(), {
        fontFamily: FONT_FAMILY,
        fontSize: '22px',
        color: COLORS.bg,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.add(this.initial);

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

  /** Move the pawn to a pixel position and refresh its task glyph/selection. */
  sync(x: number, y: number, hero: Hero, selected: boolean): void {
    this.setPosition(x, y);
    this.ring.setVisible(selected);
    this.glyph.setText(TASK_GLYPH[hero.task.kind] ?? '');
  }
}
