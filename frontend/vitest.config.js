import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    // Undo vi.spyOn and vi.stubGlobal (e.g. fetch) after every test so nothing leaks between tests.
    restoreMocks: true,
    unstubGlobals: true,
    pool: 'vmThreads',
  },
});
