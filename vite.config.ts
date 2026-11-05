import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: process.env.GITHUB_ACTIONS === 'true' ? '/TransitTales/' : '/',
  plugins: [{
    name: 'universe-resilient-startup',
    transformIndexHtml: {
      order: 'post',
      handler(html, context) {
        if (!context.filename.endsWith('universe.html')) return html;
        return html
          .replace(/<script\b[^>]*type="module"[^>]*src="[^"]*(?:\/src\/universe\/main\.ts|\/assets\/universe-[^"]+\.js)"[^>]*><\/script>/g, tag => tag.replace('type="module"', 'type="text/plain" data-universe-entry'))
          .replace(/<link\b[^>]*rel="stylesheet"[^>]*>/g, tag => tag.replace('rel="stylesheet"', 'rel="preload" as="style" data-universe-style'));
      },
    },
  }],
  optimizeDeps: {
    // Avoid on-demand camera optimization delaying the first boarding in development.
    include: ['@babylonjs/core/Cameras/freeCamera'],
  },
  build: {
    target: 'safari13',
    rollupOptions: {
      input: {
        hub: resolve(process.cwd(), 'index.html'),
        world: resolve(process.cwd(), 'build-world.html'),
        rush: resolve(process.cwd(), 'rush-hour.html'),
        escalator: resolve(process.cwd(), 'escalator.html'),
        beijing: resolve(process.cwd(), 'beijing.html'),
        melody: resolve(process.cwd(), 'melody.html'),
        universe: resolve(process.cwd(), 'universe.html'),
        economic: resolve(process.cwd(), 'economic.html'),
      },
    },
  },
});
