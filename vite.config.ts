import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: process.env.GITHUB_ACTIONS === 'true' ? '/TransitTales/' : '/',
  optimizeDeps: {
    // Avoid on-demand camera optimization delaying the first boarding in development.
    include: ['@babylonjs/core/Cameras/freeCamera'],
  },
  build: {
    rollupOptions: {
      input: {
        hub: resolve(process.cwd(), 'index.html'),
        world: resolve(process.cwd(), 'build-world.html'),
        rush: resolve(process.cwd(), 'rush-hour.html'),
        escalator: resolve(process.cwd(), 'escalator.html'),
        beijing: resolve(process.cwd(), 'beijing.html'),
      },
    },
  },
});
