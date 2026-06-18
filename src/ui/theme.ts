/**
 * Central UI theme: palette, fonts, spacing, and asset keys.
 *
 * Single source of truth so scenes and widgets stay consistent and content can
 * be re-skinned without hunting through scene code. Colors were lifted out of
 * the Phase-0 Boot scene.
 */

/** Hex color strings for Phaser text styles / DOM. */
export const COLORS = {
  bg: '#0b0e14',
  gold: '#f4d35e',
  text: '#e8ecf1',
  muted: '#9aa5b1',
  dim: '#5c6773',
} as const;

/** Same palette as numbers, for Graphics fills / camera background. */
export const HEX = {
  bg: 0x0b0e14,
  gold: 0xf4d35e,
  panel: 0x1b2230,
  panelBorder: 0x3a4660,
  buttonFill: 0x2c3a52,
  buttonFillDown: 0x223047,
  // Fortress build mode: grid cells, selection highlight, invalid-tap flash.
  gridCell: 0x141a26,
  gridLine: 0x2b3550,
  selected: 0xf4d35e,
  invalid: 0xc0392b,
} as const;

/**
 * Primary font family. 'Kenney Future' is loaded from a bundled CC0 .ttf via an
 * @font-face in index.html; we fall back to system sans-serif if it hasn't
 * loaded yet (Preload waits on it before showing the menu).
 */
export const FONT_FAMILY = '"Kenney Future", "Trebuchet MS", sans-serif';

export const FONT = {
  title: '64px',
  heading: '40px',
  button: '28px',
  body: '24px',
  small: '18px',
} as const;

/**
 * Minimum touch-target size in design pixels. The 720-wide design canvas scales
 * to roughly device width, so design px ≈ CSS px at worst; 44 satisfies the
 * mobile guideline. Buttons are sized well above this.
 */
export const TOUCH_MIN = 44;

/** Texture keys for Kenney UI art loaded in Preload (graceful fallback if absent). */
export const TEX = {
  btnBlue: 'btn-blue',
  btnBluePressed: 'btn-blue-pressed',
  btnGrey: 'btn-grey',
  btnGreyPressed: 'btn-grey-pressed',
  panel: 'panel-brown',
} as const;

/**
 * Terrain tile texture keys → `TERRAIN_TEX[type]` lists the loaded variants for a
 * terrain type. The renderer picks one deterministically per cell. Files live in
 * `public/assets/tiles/`; a missing file falls back to a drawn color.
 */
export const TERRAIN_TEX = {
  grass: ['tile-grass'],
  road: ['tile-road-a', 'tile-road-b', 'tile-road-c'],
  tree: ['tile-tree-a', 'tile-tree-b'],
  rock: ['tile-rock-a', 'tile-rock-b'],
  water: ['tile-water'],
} as const;

/** Map of every terrain tile key → its file (used by Preload). */
export const TERRAIN_FILES: Record<string, string> = {
  'tile-grass': 'grass.png',
  'tile-road-a': 'road_a.png',
  'tile-road-b': 'road_b.png',
  'tile-road-c': 'road_c.png',
  'tile-tree-a': 'tree_a.png',
  'tile-tree-b': 'tree_b.png',
  'tile-rock-a': 'rock_a.png',
  'tile-rock-b': 'rock_b.png',
  'tile-water': 'water.png',
};

/** Flat fallback colors per terrain type if a tile texture is missing. */
export const TERRAIN_HEX = {
  grass: 0x2c9b54,
  road: 0xc89b50,
  tree: 0x1f7a45,
  rock: 0x7d8a99,
  water: 0x8fd0e8,
} as const;
