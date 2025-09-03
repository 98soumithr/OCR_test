import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared')
    }
  },
  server: {
    port: 3000,
    hmr: {
      port: 3000
    }
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        sidebar: 'src/sidebar/index.html'
      }
    }
  }
});