import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './', // relative asset paths so the build works from any folder
  plugins: [
    react(),
    VitePWA({
      // A new version waits; the wall loads it at the nightly reload, phones show a "load it" button.
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'Family Wall Calendar',
        short_name: 'Wall Calendar',
        description: 'Routines, chores and the family calendar for the wall tablet and parents’ phones.',
        display: 'fullscreen',
        // "any", not "landscape": parents install it on phones too. The tablet stays landscape on its own.
        orientation: 'any',
        start_url: './',
        scope: './',
        background_color: '#ffffff',
        theme_color: '#0f6bd6',
        // Long-press the app icon on Android for these.
        shortcuts: [
          { name: 'Add to brain dump', short_name: 'Brain dump', url: './?view=braindump&capture=1', icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }] },
          { name: 'Shopping list', short_name: 'Meals', url: './?view=meals', icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }] },
          { name: 'Chores', url: './?view=chores', icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }] },
          { name: 'Week', url: './?view=week', icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }] },
        ],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // A new version takes over as soon as it has downloaded, even when an older copy is open:
        // the open page keeps running unchanged, and the next reload or opening shows the new one.
        skipWaiting: true,
        clientsClaim: true,
        // The app shell, bundled font and icons, so the wall opens with no connection.
        globPatterns: ['**/*.{js,css,html,woff2,png,svg}'],
        navigateFallback: 'index.html',
        // Firebase's own sign-in pages live under /__/ on the same site: never answer those from the cache.
        navigateFallbackDenylist: [/^\/__\//],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}', 'tests/code-gs.test.ts'],
  },
});
