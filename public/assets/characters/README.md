# Hero character art

Drop the hero pawn spritesheet here as **`heroes.png`**.

- Source: [Kenney — Roguelike Characters](https://kenney.nl/assets/roguelike-characters) (CC0)
- File: copy `roguelikeChar_transparent.png` from the pack and rename it to `heroes.png`
- Layout expected by the loader (`src/scenes/Preload.ts`): **16×16** frames, `margin: 0`,
  `spacing: 1`

This file is optional. If it's absent the game falls back to drawn colored discs, so the
build still works. Once the PNG is in place the frame indices for the idle/walk animations
may be fine-tuned in `Preload.buildHeroAnims()`.
