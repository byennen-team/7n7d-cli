import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // The CLI is built before the suite runs so the subprocess smoke test can
    // exercise the real artifact (and its real runtime dependencies).
    globalSetup: ['src/__tests__/global-setup.ts'],
    env: {
      // Keep chalk output deterministic: the assertions strip ANSI anyway, but
      // colour codes would change box widths between environments.
      FORCE_COLOR: '0',
      NO_COLOR: '1',
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/__tests__/**'],
      reporter: ['text', 'lcov'],
      thresholds: {
        statements: 90,
        lines: 90,
        branches: 90,
        functions: 85,
      },
    },
  },
})
