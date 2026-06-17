# CLAUDE.md

Project guide for **dungeon-io** — read this first before working in the repo.

## Project overview

dungeon-io is a **web-based, mobile-first, minimal MMORPG simulator**. The player
builds custom hero units ("catchers") by choosing skills and assigning attributes,
then sends a party into **dungeons** to clear waves of mobs, defeat **bosses**, and
collect **loot drops** that feed back into building stronger heroes.

Gameplay is **semi-automatic**: the party auto-advances and basic attacks fire on
their own, but the player manually times **active skills** (tapping skill buttons) to
get better results. You *can* play hands-off, but skilled manual play wins harder
fights.

It is a **single-player simulation** — it *feels* like an MMORPG (idle/auto combat,
progression, loot grind) but runs entirely in the browser with no server. All progress
saves to `localStorage`.

## Tech stack

- **Engine:** Phaser 3 (2D)
- **Language:** TypeScript (strict mode)
- **Build tool:** Vite (scaffold from the official `phaserjs/template-vite-ts`)
- **Persistence:** browser `localStorage` (no backend)
- **Hosting:** GitHub Pages, deployed via GitHub Actions
- **Target:** mobile browsers, portrait orientation, touch input

> There is **no backend**. GitHub Pages serves static files only. Do not introduce a
> server, database, or real-time multiplayer. The "MMO" feel is simulated client-side.

## Recommended gameplay format

A **side-view, party-vs-wave auto-battler / idle dungeon crawler**:

- The party of hero "catchers" advances through a dungeon: waves of mobs → mini-boss →
  boss.
- Basic attacks are automatic; the player taps **active-skill buttons** (with
  cooldowns) and times them for better results — this is the semi-auto hook.
- Mobs and bosses **drop loot** (gear, materials, skill shards) that feed hero building.

This format is chosen because it is simple to asset-source and ship on mobile while
still delivering the dungeon/boss/loot fantasy. It is a documented default, not a hard
constraint — revisit in the roadmap if a top-down crawler is preferred later.

## Architecture / target directory layout

Code does not exist yet (see `ROADMAP.md` Phase 0). When it lands, follow this layout:

```
dungeon-io/
├── index.html
├── vite.config.ts          # base: '/dungeon-io/' for GitHub Pages
├── public/                 # static files copied as-is
├── assets/                 # sprites, audio, skill icons (all CC0/free)
│   └── CREDITS.md           # license + source for every asset
├── src/
│   ├── main.ts             # Phaser game config & bootstrap
│   ├── scenes/             # Boot, Preload, MainMenu, HeroBuilder, Dungeon, Results
│   ├── systems/            # combat, loot/drops, skill engine, attributes, save/load
│   ├── data/               # skills, attributes, mobs, bosses, loot tables (data-driven)
│   ├── entities/           # Hero, Mob, Boss, Skill, Item
│   └── ui/                 # mobile HUD, skill buttons, inventory
└── .github/workflows/      # Pages build & deploy
```

## Core game systems

- **Hero building ("catchers"):** assign attributes (e.g. STR / AGI / INT / VIT →
  derived stats like HP, attack, crit, speed) and select a skill loadout. Skills are
  defined as data in `src/data`, not hard-coded into entities.
- **Semi-auto combat loop:** auto basic attacks + manually triggered active skills with
  cooldowns; damage, targeting, health, win/lose resolution. Keep it data-driven and
  unit-testable.
- **Drop / loot system:** mobs and bosses roll against loot tables; items have rarity;
  loot (gear, skill shards, materials) feeds back into hero building.
- **Dungeon / wave / boss progression:** sequenced waves → mini-boss → boss, with
  dungeon tiers and difficulty scaling.
- **Save system:** serialize heroes, inventory, and progression to `localStorage`;
  version the save format so it can be migrated later.

## Design principles

- **Mobile-first:** portrait layout, touch targets ≥ 44px, responsive scaling, no
  reliance on hover/keyboard.
- **Data-driven content:** skills, mobs, bosses, loot live in `src/data` so content can
  grow without touching engine code.
- **Deterministic-ish combat:** isolate randomness (seedable) so combat logic is
  testable.
- **Keep scope minimal:** prefer the smallest shippable increment per roadmap phase.

## Asset sourcing

Use only **free / CC0** assets. Good sources:

- **Kenney.nl** — CC0 sprite/UI/audio packs.
- **OpenGameArt.org** — check each asset's license.
- **game-icons.net** — skill/ability icons (CC BY).
- **itch.io** — free asset packs (check license).

**Rule:** record the source and license of every asset in `assets/CREDITS.md`. Respect
attribution requirements (e.g. CC BY).

## Build & run commands

(Wired up in roadmap Phase 0.)

```bash
npm install      # install dependencies
npm run dev      # local dev server with HMR
npm run build    # production build to dist/
npm run preview  # preview the production build locally
```

## Deployment

- Deploy to **GitHub Pages** via a GitHub Actions workflow that runs `npm run build`
  and publishes `dist/`.
- Set Vite `base: '/dungeon-io/'` in `vite.config.ts` so asset paths resolve correctly
  under the Pages subpath.
- Verify the deployed build loads in a **mobile/portrait** viewport.

## Conventions

- TypeScript **strict** mode; no implicit `any`.
- Prefer data-driven definitions over hard-coded content.
- Lint/format with ESLint + Prettier (added in Phase 0).
- Clear, descriptive commit messages.

## Working agreement

- Develop on branch **`claude/web-mmorpg-simulator-usp50l`**.
- Commit and push completed work to that branch.
- Do **not** add a backend, server, or real-time multiplayer — keep it static and
  client-side.
- Follow `ROADMAP.md`; each phase is a shippable, verifiable increment.
