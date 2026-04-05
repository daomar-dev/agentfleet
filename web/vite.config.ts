import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts'],
    typecheck: {
      tsconfig: './tsconfig.test.json',
    },
  },
});
