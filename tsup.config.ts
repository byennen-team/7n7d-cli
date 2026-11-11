import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node18',
  clean: true,
  dts: false,
  splitting: false,
  // @7n7d/sdk is not published to npm. It is bundled into dist/ so the
  // published package has no local-path dependency and stays installable.
  noExternal: ['@7n7d/sdk'],
  banner: {
    js: '#!/usr/bin/env node',
  },
})
