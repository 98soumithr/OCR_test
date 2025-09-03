import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import webExtension from 'vite-plugin-web-extension';
import { resolve } from 'node:path';

export default defineConfig(({ mode }) => {
  return {
    plugins: [
      react(),
      webExtension({
        manifest: resolve(__dirname, 'manifest.json'),
        watchFilePaths: [
          'src/content',
          'src/background',
          'src/sidebar',
          'src/styles'
        ],
        browser: 'chrome',
      }),
    ],
    build: {
      outDir: 'dist',
      sourcemap: mode !== 'production',
    },
    server: {
      port: 5173,
      strictPort: true,
      hmr: true,
    },
  };
});
