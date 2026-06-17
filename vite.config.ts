import { defineConfig } from 'vite';

// Served from the custom domain https://fortgion.gvart.dev/ at the site root,
// so assets resolve from '/'. (If ever served from <user>.github.io/dungeon-io/
// without a custom domain, switch base back to '/dungeon-io/'.)
export default defineConfig(() => ({
  base: '/',
  server: {
    host: true, // expose on the LAN so we can test on a real phone
  },
  build: {
    target: 'es2022',
    sourcemap: false,
  },
}));
