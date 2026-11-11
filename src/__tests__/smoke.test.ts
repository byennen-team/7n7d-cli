import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Smoke test for the built artifact.
 *
 * The bundle is built by the global setup before the suite runs. Launching it
 * proves the built entry point loads with its real runtime dependencies — a
 * mocked module graph could never show a broken `@7n7d/sdk` link.
 *
 * This covers the built artifact only. Whether an npm consumer can install
 * the published package is a separate concern: the `file:../7n7d-sdk`
 * dependency in package.json is unchanged by this work.
 */
describe('built CLI', () => {
  it('loads and lists its commands', () => {
    const bundle = resolve(process.cwd(), 'dist', 'index.js')
    const output = execFileSync(process.execPath, [bundle, '--help'], { encoding: 'utf8' })

    for (const command of ['balance', 'status', 'deposit', 'withdraw', 'approve']) {
      expect(output).toContain(command)
    }
  }, 30_000)
})
