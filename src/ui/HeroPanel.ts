import Phaser from 'phaser';
import { GAME_HEIGHT } from '../main';
import { COLORS, FONT, FONT_FAMILY, HEX } from './theme';
import { Chip } from './Chip';
import { makeButton, type Button } from './Button';
import { canPromote, type Hero, heroStats } from '../systems/hero';

/** A command the player can arm from the hero panel, then aim with a map tap. */
export type HeroCommand = 'move' | 'guard' | 'assist' | 'gather';

export interface HeroPanelConfig {
  onCommand: (cmd: HeroCommand) => void;
  onPromote: () => void;
  onClose: () => void;
}

/** Bottom sheet: pin to the bottom of the device-aspect canvas (see BuildPanel). */
const BOTTOM_SHIFT = GAME_HEIGHT - 1280;
/** Panel screen band (design px) — taps here are UI, not map taps. */
export const HERO_PANEL_TOP = 660 + BOTTOM_SHIFT;
const PANEL_BOTTOM = 1070 + BOTTOM_SHIFT;
const PANEL_X = 12;
const PANEL_W = 696;

const COMMANDS: Array<{ id: HeroCommand; title: string; sub: string }> = [
  { id: 'move', title: 'Move', sub: 'walk to' },
  { id: 'guard', title: 'Guard', sub: 'hold post' },
  { id: 'assist', title: 'Assist', sub: 'build' },
  { id: 'gather', title: 'Gather', sub: 'harvest' },
];

/**
 * Per-hero management panel, shown when a hero is selected. Lists the hero's
 * derived stats and current task, exposes the four task commands (arm one, then
 * tap a target cell on the map), and a Promote control. Mirrors the BuildPanel
 * pattern and lives in the scene's fixed UI layer.
 */
export class HeroPanel {
  readonly root: Phaser.GameObjects.Container;
  private readonly nameText: Phaser.GameObjects.Text;
  private readonly statsText: Phaser.GameObjects.Text;
  private readonly taskText: Phaser.GameObjects.Text;
  private readonly commandChips = new Map<HeroCommand, Chip>();
  private readonly promoteChip: Chip;
  private opened = false;
  private armed: HeroCommand | null = null;
  private hero: Hero | null = null;

  constructor(scene: Phaser.Scene, cfg: HeroPanelConfig) {
    this.root = scene.add.container(0, 0).setVisible(false);

    const bg = scene.add.graphics();
    bg.fillStyle(HEX.panel, 0.97);
    bg.lineStyle(2, HEX.panelBorder, 1);
    bg.fillRoundedRect(PANEL_X, HERO_PANEL_TOP, PANEL_W, PANEL_BOTTOM - HERO_PANEL_TOP, 18);
    bg.strokeRoundedRect(PANEL_X, HERO_PANEL_TOP, PANEL_W, PANEL_BOTTOM - HERO_PANEL_TOP, 18);
    this.root.add(bg);

    this.nameText = scene.add
      .text(PANEL_X + 24, HERO_PANEL_TOP + 18, '', {
        fontFamily: FONT_FAMILY,
        fontSize: FONT.body,
        color: COLORS.gold,
        fontStyle: 'bold',
      })
      .setOrigin(0, 0);
    this.statsText = scene.add
      .text(PANEL_X + 24, HERO_PANEL_TOP + 56, '', {
        fontFamily: FONT_FAMILY,
        fontSize: '16px',
        color: COLORS.text,
        lineSpacing: 4,
      })
      .setOrigin(0, 0);
    this.taskText = scene.add
      .text(PANEL_X + 24, HERO_PANEL_TOP + 132, '', {
        fontFamily: FONT_FAMILY,
        fontSize: '15px',
        color: COLORS.muted,
      })
      .setOrigin(0, 0);
    this.root.add([this.nameText, this.statsText, this.taskText]);

    // Command chips in a 4-column row.
    const cols = 4;
    const gap = 12;
    const padX = 16;
    const chipW = (PANEL_W - padX * 2 - gap * (cols - 1)) / cols;
    const chipH = 74;
    const rowY = HERO_PANEL_TOP + 196;
    COMMANDS.forEach((cmd, i) => {
      const x = PANEL_X + padX + chipW / 2 + i * (chipW + gap);
      const chip = new Chip(scene, {
        x,
        y: rowY,
        w: chipW,
        h: chipH,
        title: cmd.title,
        sub: cmd.sub,
        onTap: () => this.arm(cmd.id, cfg.onCommand),
      });
      this.commandChips.set(cmd.id, chip);
      this.root.add(chip);
    });

    this.promoteChip = new Chip(scene, {
      x: PANEL_X + padX + 110,
      y: rowY + 96,
      w: 220,
      h: 60,
      title: 'Promote',
      sub: '',
      onTap: () => cfg.onPromote(),
    });
    this.root.add(this.promoteChip);

    const close: Button = makeButton(scene, {
      x: PANEL_W - 120,
      y: rowY + 96,
      label: 'Close',
      variant: 'secondary',
      width: 200,
      height: 60,
      onClick: () => cfg.onClose(),
    });
    this.root.add(close);
  }

  isOpen(): boolean {
    return this.opened;
  }

  /** The currently armed command (a map tap aims it), or null. */
  armedCommand(): HeroCommand | null {
    return this.armed;
  }

  clearArmed(): void {
    this.armed = null;
    this.refreshArmed();
  }

  open(hero: Hero): void {
    this.hero = hero;
    this.opened = true;
    this.armed = null;
    this.root.setVisible(true);
    this.refresh();
  }

  close(): void {
    this.opened = false;
    this.armed = null;
    this.hero = null;
    this.root.setVisible(false);
  }

  /** Re-read the hero (after a task/level change) and repaint. */
  refresh(): void {
    if (!this.hero) return;
    const h = this.hero;
    const stars = h.stars > 0 ? '  ' + '★'.repeat(h.stars) : '';
    this.nameText.setText(`${h.name}    Lv ${h.level}${stars}`);
    const s = heroStats(h);
    this.statsText.setText(
      `HP ${Math.round(s.hp)}    ATK ${Math.round(s.attack)}    Crit ${Math.round(s.critPct)}%\n` +
        `Move ${s.moveSpeed.toFixed(2)}    Work ${s.workSpeed.toFixed(2)}    EXP ${Math.round(h.exp)}`
    );
    this.taskText.setText(`Task: ${h.task.kind}`);
    this.promoteChip.setEnabled(canPromote(h)).setSub(canPromote(h) ? 'ready' : `Lv ${h.level}`);
    this.refreshArmed();
  }

  private arm(cmd: HeroCommand, onCommand: (c: HeroCommand) => void): void {
    this.armed = this.armed === cmd ? null : cmd;
    this.refreshArmed();
    if (this.armed) onCommand(this.armed);
  }

  private refreshArmed(): void {
    for (const [id, chip] of this.commandChips) chip.setSelected(this.armed === id);
  }
}
