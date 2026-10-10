import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: process.env.GITHUB_ACTIONS === 'true' ? '/TransitTales/' : '/',
  build: {
    rollupOptions: {
      input: {
        hub: resolve(process.cwd(), 'index.html'),
        world: resolve(process.cwd(), 'build-world.html'),
        rush: resolve(process.cwd(), 'rush-hour.html'),
        escalator: resolve(process.cwd(), 'escalator.html'),
      },
    },
  },
});
