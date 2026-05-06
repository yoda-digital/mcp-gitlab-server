import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.e2e.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    fileParallelism: false,
    setupFiles: ['src/setup/global-setup.ts'],
    reporters: ['default', 'junit'],
    outputFile: {
      junit: './reports/junit.xml',
    },
    coverage: {
      enabled: false,
    },
  },
});
