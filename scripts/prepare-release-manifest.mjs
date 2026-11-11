#!/usr/bin/env node
/**
 * npm lifecycle hook (prepack): strip local-path dependency specs from the
 * manifest that is about to be packed.
 *
 * @7n7d/sdk is not published to npm, so it is a build-only devDependency
 * (file:../7n7d-sdk) and is bundled into dist/. A published manifest must not
 * contain a local-path spec: npm cannot resolve it for a consumer.
 *
 * The original manifest is copied next to package.json and restored by
 * scripts/restore-release-manifest.mjs (postpack). The backup lives in the
 * package root (not a pid-specific temp path) because prepack and postpack
 * run as separate processes.
 */
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const manifestPath = join(root, 'package.json')
const backupPath = join(root, '.release-manifest.backup.json')

const LOCAL_SPEC = /^(file:|link:|workspace:|\.{1,2}\/|\/)/
const DEP_FIELDS = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']

const pkg = JSON.parse(readFileSync(manifestPath, 'utf8'))
copyFileSync(manifestPath, backupPath)

const removed = []
for (const field of DEP_FIELDS) {
  for (const [name, spec] of Object.entries(pkg[field] ?? {})) {
    if (LOCAL_SPEC.test(String(spec))) {
      removed.push(field + '.' + name + ' (' + spec + ')')
      delete pkg[field][name]
    }
  }
}

writeFileSync(manifestPath, JSON.stringify(pkg, null, 2) + '\n')
console.log(
  removed.length > 0
    ? 'release manifest prepared (removed local-path deps: ' + removed.join(', ') + ')'
    : 'release manifest prepared (no local-path deps)'
)
