# CLAUDE.md

Project guide for **dungeon-io** (game title: **Fortgion**) — read this first before
working in the repo.

## Project overview

Fortgion is a **web-based, mobile-first, single-player fortress-survival roguelite**.
You command a small roster of **heroes** (with attributes, skills, equipment, star
promotion, and leveling) defending a **stronghold** against escalating raids.

Between raids you **develop the fortress** — bare terrain → buildings → walls →
towers, like a real fort — and **build your heroes**. Raids arrive as **escalating
waves** of enemies whose types and counts vary and ramp up over time (random but
balanced). There is **no destructible core**: heroes fall in battle or **desert when
morale breaks**, and the **run ends when no defenders remain and enemies hold the
fortress capture point for 30 seconds** (the fortress is occupied). The goal is to
**survive as long as possible**.

Each playthrough is a **roguelite run**: on defeat, your performance converts to
**persistent meta-currency and accumulating bonuses** that make future runs stronger.

Gameplay is **semi-automatic**: heroes and turrets auto-fire basic attacks, but the
player manually times **active skills** — hero abilities plus fortress abilities (e.g.
a cannon volley or an emergency repair) — to swing fights. You _can_ play hands-off,
but skilled manual timing survives longer.

It is a **single-player simulation** — it _feels_ like an MMORPG (idle/auto combat,
progression, loot grind) but runs entirely in the browser with no server. All progress
saves to `localStorage`.

## Tech stack

- **Engine:** Phaser 3 (2D)
- **Language:** TypeScript (strict mode)
- **Build tool:** Vite (scaffold from the official `phaserjs/template-vite-ts`)
- **Persistence:** browser `localStorage` (no backend)
- **Hosting:** GitHub Pages, deployed via GitHub Actions (custom domain
  `fortgion.gvart.dev`)
- **Target:** mobile browsers, portrait orientation, touch input

> There is **no backend**. GitHub Pages serves static files only. Do not introduce a
> server, database, or real-time multiplayer. The "MMO" feel is simulated client-side.

## Recommended gameplay format

A **fortress-defense survival** loop:

- The player builds and develops a **fortress** with a central, indestructible **capture
  point** (the location enemies must occupy to win): place walls, gates, and towers on a
  base layout.
- Heroes are stationed to defend the fortress; hero-operated weapon emplacements
  (turrets/crossbows) come later.
- Waves of enemies **raid** the fortress; heroes auto-attack, and the player taps
  **active-skill buttons** (with cooldowns) and times them for better results — this is
  the semi-auto hook.
- Between waves the player spends loot/resources to **develop the fortress and heroes**.
- Raids **escalate** wave over wave; the run ends when the fortress is **occupied** —
  defenders are killed or desert (low morale), then enemies hold the capture point for
  30 seconds. Performance feeds **meta-progression** for the next run.

This format is chosen because it is simple to asset-source and ship on mobile while
still delivering the fortress/raid/loot/survival fantasy. It is a documented default,
not a hard constraint — revisit in the roadmap if a different format is preferred later.

## Architecture / target directory layout

Code beyond the Phase 0–1 shell does not exist yet (see `ROADMAP.md`). When it lands,
follow this layout:

```
dungeon-io/
├── index.html
├── vite.config.ts          # base: '/' (custom domain fortgion.gvart.dev)
├── public/                 # static files copied as-is
├── assets/                 # sprites, audio, skill icons (all CC0/free)
│   └── CREDITS.md           # license + source for every asset
├── src/
│   ├── main.ts             # Phaser game config & bootstrap
│   ├── scenes/             # Boot, Preload, MainMenu, Fortress (build + manage), Raid (combat), Results
│   ├── systems/            # combat, fortress/build, raid spawning & wave scaling, loot/drops, skill engine, attributes, meta-progression, save/load
│   ├── data/               # heroes, skills, attributes, structures (walls/turrets/buildings), enemies, raid/wave tables, loot tables, meta-bonuses (data-driven)
│   ├── entities/           # Hero, Enemy, Structure/Turret, Skill, Item
│   └── ui/                 # mobile HUD, skill buttons, build menu, inventory
└── .github/workflows/      # Pages build & deploy
```

## Core game systems

- **Hero building:** assign attributes (e.g. STR / AGI / INT / VIT → derived stats like
  HP, attack, crit, speed), choose a skill loadout, equip gear, and promote/level
  heroes (star promotion). Heroes and skills are defined as data in `src/data`, not
  hard-coded into entities.
- **Fortress development:** a terrain/base grid where the player places **structures**
  (walls, gates, towers) around a central, indestructible **capture point**. Building and
  upgrading costs resources. Layout is data-driven. (Hero-operated emplacements come with
  the hero/combat phases.)
- **Semi-auto raid combat:** stationed heroes auto-attack incoming enemies; the player
  manually triggers active skills (hero + fortress abilities) with cooldowns; damage,
  targeting, health, **morale/desertion**, and win (wave cleared) / lose (capture point
  occupied 30s with no defenders left) resolution. Keep it data-driven and unit-testable.
- **Escalating raid / wave system:** sequenced waves with random-but-balanced enemy
  composition and difficulty that scales over the run. Isolate randomness (seedable) so
  raids are reproducible and balance is testable.
- **Survival run & meta-progression:** a run ends when the fortress is occupied; survival
  score (waves/time survived) converts to **persistent meta-currency**. Meta-upgrades
  grant **accumulating bonuses** that carry into every future run (roguelite loop).
- **Save system:** serialize meta-progression (persistent) and the current run (heroes,
  fortress layout, inventory, wave progress) to `localStorage`; version the save format
  so it can be migrated later.

## Design principles

- **Mobile-first:** portrait layout, touch targets ≥ 44px, responsive scaling, no
  reliance on hover/keyboard.
- **Data-driven content:** heroes, skills, structures, enemies, raids, and loot live in
  `src/data` so content can grow without touching engine code.
- **Deterministic-ish combat:** isolate randomness (seedable) so combat and raid
  generation are testable.
- **Random but balanced:** raid composition and scaling should feel varied yet fair —
  tune the difficulty curve against fortress/hero power, not against the RNG.
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

```bash
npm install      # install dependencies
npm run dev      # local dev server with HMR
npm run build    # production build to dist/
npm run preview  # preview the production build locally
```

## Deployment

- Deploy to **GitHub Pages** via a GitHub Actions workflow that runs `npm run build`
  and publishes `dist/`.
- Vite `base` is `'/'` because the site is served from the custom domain
  `fortgion.gvart.dev` (not a Pages subpath). If hosting moves back to a Pages subpath,
  set `base: '/dungeon-io/'` so asset paths resolve.
- Verify the deployed build loads in a **mobile/portrait** viewport.

## Conventions

- TypeScript **strict** mode; no implicit `any`.
- Prefer data-driven definitions over hard-coded content.
- Lint/format with ESLint + Prettier (added in Phase 0).
- Clear, descriptive commit messages.

## Working agreement

- Develop on branch **`claude/fortress-defense-concept-kuyb86`**.
- Commit and push completed work to that branch.
- Do **not** add a backend, server, or real-time multiplayer — keep it static and
  client-side.
- Follow `ROADMAP.md`; each phase is a shippable, verifiable increment.
