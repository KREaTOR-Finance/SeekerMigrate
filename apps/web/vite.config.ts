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
});
