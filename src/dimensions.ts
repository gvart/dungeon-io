/**
 * Design-space dimensions for the portrait canvas.
 *
 * This module deliberately imports **nothing** from the app. Scenes and UI read
 * `GAME_HEIGHT`/`BOTTOM_SHIFT` at module-evaluation time, and `main.ts` (the entry
 * that boots Phaser) also needs them — keeping them in a dependency-free leaf
 * avoids a circular import where a consumer's module body would run before
 * `GAME_HEIGHT` is initialized (a temporal-dead-zone crash that blanks the page).
 */

/** Fixed design width — the horizontal layout is tuned against it. */
export const GAME_WIDTH = 720;

/**
 * Portrait design height, derived from the device's aspect ratio at load so
 * `Scale.FIT` fills the viewport top-to-bottom instead of letterboxing on tall
 * phones. Clamped so extreme/landscape viewports still get a sane portrait canvas.
 * Falls back to the classic 720×1280 under tests / SSR (no `window`).
 */
export const GAME_HEIGHT = ((): number => {
  if (typeof window === 'undefined' || !window.innerWidth) return 1280;
  const h = Math.round(GAME_WIDTH * (window.innerHeight / window.innerWidth));
  return Math.max(1180, Math.min(1700, h));
})();

/**
 * How far bottom-pinned UI shifts down vs the classic 1280-tall design (≥ 0).
 * Bottom sheets and the footer add this so they stay flush to the bottom edge.
 */
export const BOTTOM_SHIFT = GAME_HEIGHT - 1280;
