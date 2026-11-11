#!/usr/bin/env node
/**
 * npm lifecycle hook (postpack): restore the manifest that
 * scripts/prepare-release-manifest.mjs replaced during prepack.
 */
import { copyFileSync, existsSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const manifestPath = join(root, 'package.json')
const backupPath = join(root, '.release-manifest.backup.json')

if (existsSync(backupPath)) {
  copyFileSync(backupPath, manifestPath)
  rmSync(backupPath, { force: true })
  console.log('release manifest restored')
} else {
  console.log('no release manifest backup to restore')
}
