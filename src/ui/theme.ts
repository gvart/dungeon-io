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
 * terrain type. The renderer picks one deterministically per cell. Roads are
 * handled separately via {@link ROAD_TEX} (autotiled by neighbors). Files live in
 * `public/assets/tiles/`; a missing file falls back to a drawn color.
 */
export const TERRAIN_TEX = {
  grass: ['tile-grass'],
  tree: ['tile-tree-a', 'tile-tree-b'],
  rock: ['tile-rock-a', 'tile-rock-b'],
  water: ['tile-water'],
} as const;

/**
 * Road autotile: connected-neighbor key (in `N,E,S,W` order, see `roadMask`) →
 * the tile whose path reaches exactly those edges, so roads connect correctly.
 */
export const ROAD_TEX: Record<string, string> = {
  '': 'tile-road-end-n', // isolated — reuse an end cap
  N: 'tile-road-end-n',
  E: 'tile-road-end-e',
  S: 'tile-road-end-s',
  W: 'tile-road-end-w',
  NS: 'tile-road-ns',
  EW: 'tile-road-ew',
  NE: 'tile-road-ne',
  NW: 'tile-road-nw',
  ES: 'tile-road-es',
  SW: 'tile-road-sw',
  NEW: 'tile-road-new',
  ESW: 'tile-road-esw',
  NSW: 'tile-road-nsw',
  NES: 'tile-road-nes',
  NESW: 'tile-road-nesw',
};

/** Map of every terrain tile key → its file (used by Preload). */
export const TERRAIN_FILES: Record<string, string> = {
  'tile-grass': 'grass.png',
  'tile-tree-a': 'tree_a.png',
  'tile-tree-b': 'tree_b.png',
  'tile-rock-a': 'rock_a.png',
  'tile-rock-b': 'rock_b.png',
  'tile-water': 'water.png',
  'tile-road-ns': 'road_ns.png',
  'tile-road-ew': 'road_ew.png',
  'tile-road-nesw': 'road_nesw.png',
  'tile-road-esw': 'road_esw.png',
  'tile-road-new': 'road_new.png',
  'tile-road-ne': 'road_ne.png',
  'tile-road-nw': 'road_nw.png',
  'tile-road-es': 'road_es.png',
  'tile-road-sw': 'road_sw.png',
  'tile-road-nsw': 'road_nsw.png',
  'tile-road-nes': 'road_nes.png',
  'tile-road-end-e': 'road_end_e.png',
  'tile-road-end-n': 'road_end_n.png',
  'tile-road-end-s': 'road_end_s.png',
  'tile-road-end-w': 'road_end_w.png',
};

/** Flat fallback colors per terrain type if a tile texture is missing. */
export const TERRAIN_HEX = {
  grass: 0x2c9b54,
  road: 0xc89b50,
  tree: 0x1f7a45,
  rock: 0x7d8a99,
  water: 0x8fd0e8,
} as const;
