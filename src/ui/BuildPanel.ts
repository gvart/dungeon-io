import Phaser from 'phaser';
import { BOTTOM_SHIFT } from '../dimensions';
import { COLORS, FONT, FONT_FAMILY, HEX } from './theme';
import { Chip } from './Chip';
import { BUILDABLE, CLEAR_COST, getStructure, levelUpCost, MAX_LEVEL } from '../data/structures';

/** Current build-panel selection driving what a map tap does. */
export type BuildSelection =
  | { mode: 'build'; defId: string }
  | { mode: 'clear' }
  | { mode: 'remove' }
  | { mode: 'none' };

export interface BuildPanelConfig {
  /** Notified whenever the selection changes. */
  onChange: (selection: BuildSelection) => void;
  /** Tapped the Level-Up control. */
  onLevelUp: () => void;
}

/**
 * As a bottom sheet, the panel is pinned to the bottom of the (now device-aspect)
 * canvas: shift its fixed 1280-design band down by `BOTTOM_SHIFT` (how much taller
 * the canvas is). `PANEL_TOP` stays the screen band Fortress tests taps against.
 */
/** Panel screen band (design px) — taps here are UI, not map taps. */
export const PANEL_TOP = 690 + BOTTOM_SHIFT;
const PANEL_BOTTOM = 1070 + BOTTOM_SHIFT;
const PANEL_X = 12;
const PANEL_W = 696;

const CLEAR_ID = '__clear';
const REMOVE_ID = '__remove';

/**
 * Toggleable build panel (replaces the old always-visible BuildMenu). Opened by
 * a Build button, it lists buildable structures (locked ones disabled with their
 * required level), a Clear-obstacle tool, a Remove tool, and a Level-Up control.
 * Lives in the scene's fixed UI layer.
 */
export class BuildPanel {
  readonly root: Phaser.GameObjects.Container;
  private readonly chips = new Map<string, Chip>();
  private readonly levelChip: Chip;
  private selection: BuildSelection = { mode: 'none' };
  private opened = false;
  private level = 1;
  private resources = 0;

  constructor(scene: Phaser.Scene, cfg: BuildPanelConfig) {
    this.root = scene.add.container(0, 0).setVisible(false);

    const bg = scene.add.graphics();
    bg.fillStyle(HEX.panel, 0.96);
    bg.lineStyle(2, HEX.panelBorder, 1);
    bg.fillRoundedRect(PANEL_X, PANEL_TOP, PANEL_W, PANEL_BOTTOM - PANEL_TOP, 18);
    bg.strokeRoundedRect(PANEL_X, PANEL_TOP, PANEL_W, PANEL_BOTTOM - PANEL_TOP, 18);
    this.root.add(bg);

    const title = scene.add
      .text(scene.scale.width / 2, PANEL_TOP + 28, 'BUILD', {
        fontFamily: FONT_FAMILY,
        fontSize: FONT.body,
        color: COLORS.gold,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.root.add(title);

    // Level-Up control.
    this.levelChip = new Chip(scene, {
      x: scene.scale.width / 2,
      y: PANEL_TOP + 78,
      w: 360,
      h: 60,
      title: 'Level 1',
      sub: '',
      onTap: () => cfg.onLevelUp(),
    });
    this.root.add(this.levelChip);

    // Build / tool chips in a 4-column grid.
    const items: Array<{ id: string; title: string }> = [
      ...BUILDABLE.map((id) => ({ id, title: getStructure(id)?.name ?? id })),
      { id: CLEAR_ID, title: 'Clear' },
      { id: REMOVE_ID, title: 'Remove' },
    ];
    const cols = 4;
    const gap = 12;
    const padX = 16;
    const chipW = (PANEL_W - padX * 2 - gap * (cols - 1)) / cols;
    const chipH = 78;
    const gridTop = PANEL_TOP + 140;
    items.forEach((item, i) => {
      const c = i % cols;
      const r = Math.floor(i / cols);
      const x = PANEL_X + padX + chipW / 2 + c * (chipW + gap);
      const y = gridTop + r * (chipH + 14);
      const chip = new Chip(scene, {
        x,
        y,
        w: chipW,
        h: chipH,
        title: item.title,
        sub: '',
        onTap: () => this.select(item.id, cfg.onChange),
      });
      this.chips.set(item.id, chip);
      this.root.add(chip);
    });

    this.refresh();
  }

  isOpen(): boolean {
    return this.opened;
  }

  toggle(): void {
    if (this.opened) this.close();
    else this.open();
  }

  open(): void {
    this.opened = true;
    this.root.setVisible(true);
  }

  close(): void {
    this.opened = false;
    this.root.setVisible(false);
    this.selection = { mode: 'none' };
    this.refreshSelected();
  }

  setLevel(level: number): void {
    this.level = level;
    this.refresh();
  }

  setResources(resources: number): void {
    this.resources = resources;
    this.refresh();
  }

  getSelection(): BuildSelection {
    return this.selection;
  }

  private select(id: string, onChange: (s: BuildSelection) => void): void {
    const next: BuildSelection =
      id === CLEAR_ID
        ? { mode: 'clear' }
        : id === REMOVE_ID
          ? { mode: 'remove' }
          : { mode: 'build', defId: id };
    // Tapping the active chip clears the selection.
    this.selection = this.isActive(id) ? { mode: 'none' } : next;
    this.refreshSelected();
    onChange(this.selection);
  }

  private isActive(id: string): boolean {
    if (id === CLEAR_ID) return this.selection.mode === 'clear';
    if (id === REMOVE_ID) return this.selection.mode === 'remove';
    return this.selection.mode === 'build' && this.selection.defId === id;
  }

  /** Refresh enabled/sub state from current level + resources. */
  private refresh(): void {
    for (const [id, chip] of this.chips) {
      if (id === CLEAR_ID) {
        chip.setSub(`${CLEAR_COST}`).setEnabled(true);
        continue;
      }
      if (id === REMOVE_ID) {
        chip.setSub('refund').setEnabled(true);
        continue;
      }
      const def = getStructure(id);
      if (!def) continue;
      const locked = this.level < def.requiredLevel;
      chip.setEnabled(!locked).setSub(locked ? `Lv ${def.requiredLevel}` : `${def.cost}`);
    }

    if (this.level >= MAX_LEVEL) {
      this.levelChip.setSub('MAX').setEnabled(false);
    } else {
      const cost = levelUpCost(this.level);
      this.levelChip.setSub(`Up: ${cost}`).setEnabled(this.resources >= cost);
    }
    // Title shows current level (Chip exposes only sub setter; rebuild via sub is
    // enough, but reflect level in the sub line of the level chip's title text).
    this.levelChip.setTitle(`Level ${this.level}`);

    this.refreshSelected();
  }

  private refreshSelected(): void {
    for (const [id, chip] of this.chips) chip.setSelected(this.isActive(id));
  }
}
