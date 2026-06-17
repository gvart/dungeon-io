import { defineConfig } from 'vite';

// Served from https://<user>.github.io/dungeon-io/, so assets must resolve
// under the repo-name subpath. Use '/' locally for `vite dev`/`preview`.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/dungeon-io/' : '/',
  server: {
    host: true, // expose on the LAN so we can test on a real phone
  },
  build: {
    target: 'es2022',
    sourcemap: false,
  },
}));
