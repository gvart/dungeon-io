# dungeon-io (Fortgion) — Roadmap

Phased plan for building the game. Each phase is a **shippable, verifiable increment**
that builds on the previous one. See `CLAUDE.md` for stack, conventions, and
architecture.

**Vision:** a mobile-first, single-player **fortress-survival roguelite** — build a
roster of heroes (attributes, skills, equipment, stars), develop a stronghold (terrain
→ buildings → walls → turrets), and defend a fortress **core** against escalating raid
waves in semi-automatic combat. Survive as long as possible; on defeat, earn
**accumulating meta-bonuses** that strengthen future runs. Static, client-side, hosted
on GitHub Pages.

---

## Phase 0 — Project scaffold & deploy pipeline ✅ DONE

**Goal:** an empty-but-real Phaser game that builds and is live.

- Scaffold Phaser 3 + Vite + TypeScript (from `phaserjs/template-vite-ts`).
- Enable TS strict mode; add ESLint + Prettier.
- Set Vite `base` (now `'/'` for the custom domain `fortgion.gvart.dev`).
- Add a GitHub Actions workflow to build and deploy `dist/`.
- A Boot scene renders a placeholder screen.

**Done when:** `npm run dev` and `npm run build` work locally, and the deployed page
loads on a mobile/portrait viewport.

---

## Phase 1 — Mobile shell & scene flow ✅ DONE

**Goal:** the app frame and navigation between the main screens.

- Portrait-locked, responsive scaling (Phaser Scale Manager).
- Touch-friendly HUD baseline (buttons ≥ 44px).
- Scene routing across the main loop: **MainMenu → Fortress → Raid → Results →
  MainMenu**.
- Placeholder CC0 art and a basic font/UI theme.

**Done when:** you can navigate the full loop of empty scenes on a phone via touch.

> Note: the current shell scenes are named `HeroBuilder`/`Dungeon`; they are renamed to
> `Fortress`/`Raid` as the corresponding gameplay lands in Phases 2–4.

---

## Phase 2 — Fortress core & build mode

**Goal:** lay out and develop a stronghold.

- A terrain/base grid and a **build menu** for placing structures.
- Placeable **structures**: walls, turrets, and support buildings (data-driven in
  `src/data`).
- A central **fortress core** with HP — the thing that must not fall.
- Basic resources to gate building.
- Persist the fortress layout to `localStorage`.

**Done when:** you can lay out a fortress, place structures around the core, reload the
page, and the layout persists.

---

## Phase 3 — Heroes & garrison

**Goal:** create heroes and station them on the fortress.

- Attribute system (e.g. STR / AGI / INT / VIT) → derived stats (HP, attack, crit,
  speed).
- Skill loadout, equipment slots, and star promotion / leveling.
- Skills and heroes defined as data in `src/data`.
- Station heroes at defensive positions on the fortress; persist the roster.

**Done when:** you can build a hero, assign attributes/skills/gear, station it, save,
reload, and everything persists.

---

## Phase 4 — Raid combat loop (semi-auto)

**Goal:** the heart of the game — a single raid wave attacking the fortress.

- A wave of enemies advances on the fortress.
- Turrets and stationed heroes auto-attack; the player taps **active-skill buttons**
  (hero + fortress abilities) with cooldowns.
- Damage, targeting, health bars; **win** when the wave is cleared, **lose** when the
  core is destroyed.
- Combat logic data-driven and unit-testable; randomness isolated/seedable.

**Done when:** a raid wave plays out against your fortress, the player can tap skills to
swing the outcome, and it resolves to win or lose.

---

## Phase 5 — Escalating raids & survival run

**Goal:** turn single raids into a survival run.

- Sequenced **escalating waves** with random-but-balanced enemy composition and
  difficulty scaling over the run.
- A short build/repair phase between waves.
- The run ends when the core falls; a **Results** screen shows the survival score
  (waves / time survived).

**Done when:** a full run escalates wave over wave until the fortress falls, and a
survival score is shown.

---

## Phase 6 — Loot & development economy

**Goal:** the grind that feeds fortress and hero development.

- Loot tables for enemies and wave clears; item rarity tiers; materials and skill
  shards.
- Spend resources mid-run to upgrade fortress structures and heroes.
- Inventory UI; equip gear and skill shards.
- Persist the current run to `localStorage`.

**Done when:** clearing waves yields loot, and spending it measurably changes the
fortress and heroes in combat.

---

## Phase 7 — Meta-progression (roguelite)

**Goal:** make defeat rewarding and runs cumulative.

- On run end, convert performance (waves/time survived) into persistent
  **meta-currency**.
- A meta-upgrade screen with **accumulating bonuses** that carry into every future run
  (stronger starting fortress/heroes, new unlocks).
- Persist and version the meta save separately from the per-run save.

**Done when:** a finished run grants meta-currency, and buying a bonus makes the next
run start measurably stronger.

---

## Phase 8 — Balance, QA & content expansion

**Goal:** breadth and stability.

- More structures, enemies, heroes, and skills (data-driven, no engine changes).
- Balance pass on the raid-scaling curve vs. fortress/hero power and meta-bonuses.
- Mobile performance pass; SFX and music (CC0), combat juice and feedback.
- Save-format versioning and migration.

**Done when:** there is enough content for a satisfying play session, the game runs
smoothly on mid-range phones, and old saves migrate cleanly.

---

## Notes

- Raid generation should feel **random but balanced**: vary enemy composition and ramp
  difficulty over the run, but tune the curve against fortress/hero power rather than
  against the RNG. Keep randomness **seedable** so raids are reproducible and balance is
  testable.
- Keep everything static and client-side; no backend (see `CLAUDE.md`).
