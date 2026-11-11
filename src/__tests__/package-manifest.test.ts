import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * The published manifest must only contain dependencies a consumer can
 * install. @7n7d/sdk is not on npm, so it is bundled into dist/ and kept as
 * a build-only devDependency; a local-path spec in `dependencies` would make
 * the published package uninstallable.
 */
const pkg = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
)

const LOCAL_SPEC = /^(file:|link:|workspace:|\.{1,2}\/|\/)/

describe('published package manifest', () => {
  it('has no runtime dependency that only exists on this machine', () => {
    for (const [name, spec] of Object.entries(pkg.dependencies ?? {})) {
      expect(String(spec), `runtime dependency ${name}`).not.toMatch(LOCAL_SPEC)
    }
  })

  it('keeps the unpublished SDK as a build-only dependency', () => {
    expect(pkg.dependencies?.['@7n7d/sdk']).toBeUndefined()
    expect(pkg.devDependencies?.['@7n7d/sdk']).toBe('file:../7n7d-sdk')
  })

  it('publishes the built artifact and its docs', () => {
    expect(pkg.files).toContain('dist')
  })

  it('gates every publish on the installability check', () => {
    expect(pkg.scripts?.prepublishOnly).toBe('npm run verify:publishable')
    expect(pkg.scripts?.['verify:publishable']).toContain('verify-publishable.mjs')
  })
})
