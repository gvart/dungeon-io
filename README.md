# dungeon-io (Fortgion)

A mobile-first, single-player **fortress-survival roguelite** built with **Phaser 3 +
TypeScript + Vite**. Build a roster of heroes (skills, attributes, equipment, stars),
develop a stronghold (terrain → buildings → walls → turrets), and defend the fortress
core against **escalating raid waves** in **semi-automatic** combat. Survive as long as
possible; on defeat, earn accumulating meta-bonuses that strengthen future runs. Runs
entirely in the browser (no backend) and is hosted on GitHub Pages.

## Docs

- [`CLAUDE.md`](./CLAUDE.md) — project guide: stack, architecture, conventions.
- [`ROADMAP.md`](./ROADMAP.md) — phased development plan.

## Develop

```bash
npm install
npm run dev      # local dev server (also exposed on the LAN for phone testing)
npm run build    # type-check + production build to dist/
npm run preview  # preview the production build
npm run lint     # eslint + prettier check
npm run format   # prettier --write
```

## Deploy

Pushing to `main` builds and publishes to GitHub Pages via
[`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml). Enable it once in the
repo settings: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
