import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { runCommand } from '../../scripts/lib/exec.mjs'

/**
 * Builds the sibling SDK package once before the suite runs.
 */
function buildSdkIfNeeded(): void {
  const sdkDir = resolve(process.cwd(), '..', '7n7d-sdk')
  if (!existsSync(resolve(sdkDir, 'package.json'))) {
    return
  }
  if (existsSync(resolve(sdkDir, 'dist', 'index.js'))) {
    return
  }

  try {
    // The runner resolves the platform specific way to launch npm: npm is a
    // `.cmd` shim on Windows and cannot be executed directly there.
    runCommand('npm', ['run', 'build'], { cwd: sdkDir, stdio: 'inherit' })
  } catch (error) {
    throw new Error(
      `The sibling SDK at ${sdkDir} has no build output and could not be built. ` +
        'Install and build it first: npm install && npm run build',
    )
  }
}

/**
 * Prepare the workspace before the suite runs.
 *
 * 1. Build the sibling `@7n7d/sdk` when it is present but unbuilt — the CLI
 *    depends on it through `file:../7n7d-sdk`, so the real package must exist
 *    for type checking and for the runtime smoke test.
 * 2. Build the CLI, because the subprocess smoke test launches the real
 *    `dist/index.js` artifact.
 */
export default function setup(): void {
  buildSdkIfNeeded()

  runCommand('npm', ['run', 'build'], { cwd: process.cwd(), stdio: 'inherit' })

  const bundle = resolve(process.cwd(), 'dist', 'index.js')
  if (!existsSync(bundle)) {
    throw new Error(`Build finished but ${bundle} is missing`)
  }
}
