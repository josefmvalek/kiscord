import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './js'),
      '@core': path.resolve(__dirname, './js/core'),
      '@domains': path.resolve(__dirname, './js/domains'),
      '@shared': path.resolve(__dirname, './js/shared'),
      '@types': path.resolve(__dirname, './js/types')
    }
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    include: ['tests/unit/**/*.test.js', 'tests/integration/**/*.test.js'],
  },
});
