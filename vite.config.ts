import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const serviceWorkerPath = path.resolve(__dirname, 'public/service-worker.js');
  return {
    plugins: [
      react(),
      tailwindcss(),
      viteSingleFile(),
      {
        name: 'emit-service-worker',
        apply: 'build',
        generateBundle() {
          this.emitFile({
            type: 'asset',
            fileName: 'service-worker.js',
            source: fs.readFileSync(serviceWorkerPath, 'utf8'),
          });
        },
      },
    ],
    build: {
      minify: 'terser',
      cssMinify: 'lightningcss',
      copyPublicDir: false,
      assetsInlineLimit: 100000000,
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
      },
    },
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        '@mimisOS/sdk': path.resolve(__dirname, './src/core/sdk'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
