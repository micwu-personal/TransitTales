import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: { world: resolve(process.cwd(), 'index.html'), rush: resolve(process.cwd(), 'rush-hour.html') },
    },
  },
});
