# dungeon-io

A mobile-first, single-player **MMORPG simulator** built with **Phaser 3 + TypeScript +
Vite**. Build custom hero "catchers" (skills + attributes), send a party into dungeons,
clear mob waves and bosses in **semi-automatic** combat, and grind loot. Runs entirely
in the browser (no backend) and is hosted on GitHub Pages.

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
