# Hero character art

`heroes.png` is the **Kenney "Roguelike Characters"** spritesheet
(`roguelikeChar_transparent.png`, CC0) — a 54×12 grid of **16×16** tiles with **1px**
spacing (loaded in `src/scenes/Preload.ts`).

Each hero is given a distinct character tile by
`src/scenes/fortress/heroAppearance.ts` (the `CHARACTER_FRAMES` list points at the
detailed humanoid tiles in the sheet's first two columns). `HeroSprite` renders the tile
and animates it with a hop tween — the pack's characters are single static tiles, so there
are no walk frames.

If this file is ever removed the game still runs: `HeroSprite` falls back to a drawn
colored disc. See `assets/CREDITS.md` for license/source.
