# Fortress structure tiles

Drop **square, transparent PNGs** here to replace the drawn placeholder shapes in
fortress build mode. The Fortress scene renders a sprite whenever the matching
texture loaded, and falls back to the colored shape + label if a file is missing —
so these are optional and can be added incrementally.

## Expected files

| File             | Structure                  | Build menu    |
| ---------------- | -------------------------- | ------------- |
| `wall.png`       | Wall                       | WALL          |
| `gate.png`       | Gate                       | GATE          |
| `tower.png`      | Tower                      | TOWER         |
| `stronghold.png` | Stronghold (capture point) | build first   |

- **Format:** PNG, transparent background, square aspect (≈128×128 recommended).
- **Naming:** must match exactly — the loader maps `texKey` `struct-<name>` to
  `<name>.png` (see `src/scenes/Preload.ts`).

## Sourcing (must be CC0, or CC BY with attribution recorded in ../CREDITS.md)

- Kenney — Medieval RTS: https://kenney.nl/assets/medieval-rts (CC0)
- Kenney — Tiny Battle: https://kenney.nl/assets/tiny-battle (CC0)
- Kenney — Tower Defense (Top-Down): https://kenney.nl/assets/tower-defense-top-down (CC0)
- game-icons.net (CC BY — attribute): castle / tower / brick-wall / portcullis

After adding files, record their source and license in `assets/CREDITS.md`.
