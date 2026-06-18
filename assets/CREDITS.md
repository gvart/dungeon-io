# Asset credits

Every asset in this folder must be **free / CC0** (or properly attributed if its
license requires it). Record each asset here before committing it.

> Runtime-loaded files live in `public/assets/` (served as-is by Vite). The table
> below tracks their source and license.

| Asset                                     | Source                                                                           | Author    | License | Notes                              |
| ----------------------------------------- | -------------------------------------------------------------------------------- | --------- | ------- | ---------------------------------- |
| `public/assets/ui/button_long_*.png`      | [Kenney UI Pack — RPG Expansion](https://kenney.nl/assets/ui-pack-rpg-expansion) | Kenney.nl | CC0 1.0 | Blue/grey long buttons + pressed   |
| `public/assets/ui/panel_brown.png`        | [Kenney UI Pack — RPG Expansion](https://kenney.nl/assets/ui-pack-rpg-expansion) | Kenney.nl | CC0 1.0 | Nine-slice content panel           |
| `public/assets/ui/panelInset_beige.png`   | [Kenney UI Pack — RPG Expansion](https://kenney.nl/assets/ui-pack-rpg-expansion) | Kenney.nl | CC0 1.0 | Inset panel (reserved for later)   |
| `public/assets/fonts/KenneyFuture.ttf`    | [Kenney UI Pack](https://kenney.nl/assets/ui-pack)                               | Kenney.nl | CC0 1.0 | UI font ("Kenney Future")          |
| `public/assets/structures/wall.png`       | [Kenney — Medieval RTS](https://kenney.nl/assets/medieval-rts)                   | Kenney.nl | CC0 1.0 | Stone tile (medievalTile_15)       |
| `public/assets/structures/gate.png`       | [Kenney — Medieval RTS](https://kenney.nl/assets/medieval-rts)                   | Kenney.nl | CC0 1.0 | Wooden gate (medievalStructure_08) |
| `public/assets/structures/tower.png`      | [Kenney — Medieval RTS](https://kenney.nl/assets/medieval-rts)                   | Kenney.nl | CC0 1.0 | Watchtower (medievalStructure_12)  |
| `public/assets/structures/stronghold.png` | [Kenney — Medieval RTS](https://kenney.nl/assets/medieval-rts)                   | Kenney.nl | CC0 1.0 | Castle (medievalStructure_06)      |

| `public/assets/tiles/grass.png` | [Kenney — Medieval RTS](https://kenney.nl/assets/medieval-rts) | Kenney.nl | CC0 1.0 | Ground base (medievalTile*57) |
| `public/assets/tiles/road*\*.png`         | [Kenney — Medieval RTS](https://kenney.nl/assets/medieval-rts)                   | Kenney.nl | CC0 1.0 | Road autotile set (medievalTile_03–07, 22–26, 31–35) |
|`public/assets/tiles/tree_a/b.png`       | [Kenney — Medieval RTS](https://kenney.nl/assets/medieval-rts)                   | Kenney.nl | CC0 1.0 | Tree obstacles (medievalTile_42/44) |
|`public/assets/tiles/rock_a/b.png`       | [Kenney — Medieval RTS](https://kenney.nl/assets/medieval-rts)                   | Kenney.nl | CC0 1.0 | Rock obstacles (medievalTile_49/50) |
|`public/assets/tiles/water.png` | [Kenney — Medieval RTS](https://kenney.nl/assets/medieval-rts) | Kenney.nl | CC0 1.0 | Water (medievalTile_27) |

> **Structure tiles:** sourced from Kenney's Medieval RTS pack (CC0 — no
> attribution required). Modified for this project: building sprites had their
> transparent margins cropped so they sit centered in a grid cell; the wall uses
> the stone tile at full size so adjacent walls read as a continuous rampart.
>
> **Terrain tiles:** the 64×64 ground/road/obstacle/water tiles are copied
> unmodified from the same pack and stamped into the procedurally-generated map.

## Hero characters

| Asset                                 | Source                                                                         | Author    | License | Notes                                  |
| ------------------------------------- | ------------------------------------------------------------------------------ | --------- | ------- | -------------------------------------- |
| `public/assets/characters/heroes.png` | [Kenney — Roguelike Characters](https://kenney.nl/assets/roguelike-characters) | Kenney.nl | CC0 1.0 | 16×16 top-down pawns, 1px tile spacing |

> **Hero pawns:** the on-map heroes use this top-down character spritesheet
> (`roguelikeChar_transparent.png` from the pack, saved as `heroes.png`). Loaded as
> a 16×16 spritesheet with 1px spacing; `Preload` builds idle/walk animations and
> `HeroSprite` tints each pawn for variety. The file is **optional** — if it's
> missing the game falls back to drawn colored discs, so it still builds and runs.

## Approved sources

- [Kenney.nl](https://kenney.nl) — CC0 sprite / UI / audio packs
- [OpenGameArt.org](https://opengameart.org) — check each asset's license
- [game-icons.net](https://game-icons.net) — skill/ability icons (CC BY — attribute)
- [itch.io](https://itch.io) — free asset packs (check license)
