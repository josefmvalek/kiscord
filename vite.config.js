import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: './',
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './js'),
      '@core': path.resolve(__dirname, './js/core'),
      '@domains': path.resolve(__dirname, './js/domains'),
      '@shared': path.resolve(__dirname, './js/shared'),
      '@types': path.resolve(__dirname, './js/types')
    }
  },
  build: {
    outDir: 'dist',
    minify: 'terser',
    rollupOptions: {
      input: {
        main: './index.html',
      },
      output: {
        manualChunks(id) {
          if (id.includes('@supabase/')) {
            return 'vendor-supabase';
          }
        }
      }
    },
  },
  server: {
    host: true,
    port: 3000,
    open: true,
  },
});
