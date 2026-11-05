import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './', // relative asset paths so the build works from any folder
  plugins: [react()],
  test: {
    environment: 'jsdom',
  },
});
