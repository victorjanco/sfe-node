import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@sfe/core': fileURLToPath(new URL('../../packages/sfe-core/src/index.ts', import.meta.url)),
    },
  },
  optimizeDeps: {
    exclude: ['@sfe/core'],
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/catalog': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});