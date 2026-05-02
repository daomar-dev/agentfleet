import { defineConfig, type Plugin } from 'vite';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, join } from 'path';

/** Vite plugin that stamps `__BUILD_HASH__` in `public/sw.js` at build time. */
function swBuildHashPlugin(): Plugin {
  return {
    name: 'sw-build-hash',
    apply: 'build',
    closeBundle() {
      const swPath = resolve(__dirname, 'dist', 'web', 'sw.js');
      const content = readFileSync(swPath, 'utf-8');
      const hash = Date.now().toString(36);
      writeFileSync(swPath, content.replace('__BUILD_HASH__', hash), 'utf-8');
    },
  };
}

/**
 * Vite plugin that serves `.well-known/` files from `public/` during dev.
 * Vite's dev server skips dot-prefixed paths by default.
 */
function wellKnownPlugin(): Plugin {
  return {
    name: 'serve-well-known',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.startsWith('/.well-known/')) {
          const filePath = join(__dirname, 'static-root', req.url);
          if (existsSync(filePath)) {
            const content = readFileSync(filePath, 'utf-8');
            res.setHeader('Content-Type', 'application/json');
            res.end(content);
            return;
          }
        }
        next();
      });
    },
  };
}

export default defineConfig({
  root: '.',
  base: '/web/',
  plugins: [wellKnownPlugin(), swBuildHashPlugin()],
  build: {
    outDir: 'dist/web',
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
