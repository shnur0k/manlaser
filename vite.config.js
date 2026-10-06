import { defineConfig } from 'vite';
import sitePlugin from './build/plugin.js';

// Страницы не лежат в репозитории как .html — они собираются из /content
// и шаблонов /src/templates плагином ./build/plugin.js (и в dev, и при сборке).
export default defineConfig({
  appType: 'mpa',
  plugins: [sitePlugin()],
  server: {
    port: 5173,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsInlineLimit: 2048,
    // 3D-сцена с Three.js — отдельный файл ~800 КБ (215 КБ gzip), грузится только на главной
    chunkSizeWarningLimit: 900,
  },
});
