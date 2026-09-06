import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    environment: 'node',
    // Yalnız birim testleri; tarayıcı QA'i puppeteer betiklerinde.
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/server/**', 'src/lib/**'],
      reporter: ['text-summary'],
    },
  },
});
