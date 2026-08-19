import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// Bundles the real App for the jsdom UI test (test/ui/storefront.dom.mjs).
export default defineConfig({
  plugins: [react()],
  root: projectRoot,
  logLevel: 'error',
  define: { 'import.meta.env.PROD': 'false' },
  build: {
    ssr: 'test/ui/app-entry.jsx',
    outDir: 'test/ui/.build',
    emptyOutDir: true,
    rollupOptions: { output: { manualChunks: undefined, format: 'es' } }
  }
});
