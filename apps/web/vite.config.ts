import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  // NOTE: Keep assets inside apps/web/public so Vercel (rootDir=apps/web) includes them.
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    // Local dev: proxy Vercel-style /api/* routes to the root dev API server.
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY ?? 'http://localhost:5055',
        changeOrigin: true,
      },
    },
  },
});
