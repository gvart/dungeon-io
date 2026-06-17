# dungeon-io — Roadmap

Phased plan for building the game. Each phase is a **shippable, verifiable increment**
that builds on the previous one. See `CLAUDE.md` for stack, conventions, and
architecture.

**Vision:** a mobile-first, single-player MMORPG _simulator_ — build hero "catchers"
(skills + attributes), send a party into dungeons, clear mob waves and bosses in
semi-automatic combat, and grind loot to build stronger heroes. Static, client-side,
hosted on GitHub Pages.

---

## Phase 0 — Project scaffold & deploy pipeline

**Goal:** an empty-but-real Phaser game that builds and is live on GitHub Pages.

- Scaffold Phaser 3 + Vite + TypeScript (from `phaserjs/template-vite-ts`).
- Enable TS strict mode; add ESLint + Prettier.
- Set `base: '/dungeon-io/'` in `vite.config.ts`.
- Add a GitHub Actions workflow to build and deploy `dist/` to GitHub Pages.
- A Boot scene renders a placeholder "hello dungeon" screen.

**Done when:** `npm run dev` and `npm run build` work locally, and the deployed page
loads on a mobile/portrait viewport.

---

## Phase 1 — Mobile shell & scene flow

**Goal:** the app frame and navigation between the main screens.

- Portrait-locked, responsive scaling (Phaser Scale Manager).
- Touch-friendly HUD baseline (buttons ≥ 44px).
- Scene routing: **MainMenu → HeroBuilder → Dungeon → Results → MainMenu**.
- Placeholder CC0 art and a basic font/UI theme.

**Done when:** you can navigate the full loop of empty scenes on a phone via touch.

---

## Phase 2 — Hero builder ("catchers")

**Goal:** create and save custom heroes.

- Attribute system (e.g. STR / AGI / INT / VIT) → derived stats (HP, attack, crit,
  speed).
- Skill selection / loadout UI; skills defined as data in `src/data/skills`.
- Persist created heroes and party composition to `localStorage`.

**Done when:** you can build a hero, assign attributes and skills, save it, reload the
page, and the hero is still there.

---

## Phase 3 — Core combat loop (semi-auto)

**Goal:** the heart of the game — semi-automatic party-vs-wave combat.

- Side-view party vs a wave of mobs.
- Automatic basic attacks; manual **active-skill buttons** with cooldowns.
- Damage, targeting, health bars, win/lose resolution.
- Combat logic data-driven and unit-testable; randomness isolated/seedable.

**Done when:** a built party auto-fights a mob wave, the player can tap skills to swing
the outcome, and the fight resolves to win or lose.

---

## Phase 4 — Dungeon & boss progression

**Goal:** turn single fights into dungeon runs.

- Wave sequencing within a dungeon: mob waves → mini-boss → boss.
- Dungeon tiers / difficulty scaling.
- A run **Results** screen (cleared, rewards summary).

**Done when:** you can start a dungeon, fight through waves to a boss, and see a results
screen.

---

## Phase 5 — Drops & loot

**Goal:** the grind that feeds hero building.

- Loot tables for mobs and bosses; item rarity tiers.
- Inventory UI; equip gear and skill shards.
- Equipment/shards feed back into hero stats and skills.
- Persist inventory to `localStorage`.

**Done when:** killing mobs/bosses drops items, you can equip them, and equipped items
measurably change a hero in combat.

---

## Phase 6 — Progression & "MMO feel" polish

**Goal:** make it feel alive and rewarding.

- Currencies and hero leveling.
- Optional: simulated leaderboard / "other players" flavor (still static).
- Offline / idle progress on return.
- SFX and music (CC0), combat juice and feedback.

**Done when:** progression persists across sessions, returning grants idle gains, and
the game feels responsive and rewarding on mobile.

---

## Phase 7 — Balance, QA & content expansion

**Goal:** breadth and stability.

- More skills, mobs, bosses, and dungeons (data-driven, no engine changes).
- Balance pass on attributes, skills, and loot.
- Mobile performance pass.
- Save-format versioning and migration.

**Done when:** there is enough content for a satisfying play session, the game runs
smoothly on mid-range phones, and old saves migrate cleanly.

---

## Notes

- The side-view auto-battler format (Phase 3+) is the recommended default; it can be
  revisited in favor of a top-down crawler if desired — decide before Phase 3.
- Keep everything static and client-side; no backend (see `CLAUDE.md`).
