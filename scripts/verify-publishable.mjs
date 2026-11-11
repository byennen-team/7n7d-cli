#!/usr/bin/env node
/**
 * Prove the CLI is publishable.
 *
 * @7n7d/sdk is not on npm, so it cannot be a runtime dependency of the
 * published package: it is bundled into dist/ and kept as a build-only
 * devDependency. This script stages the release manifest (the build-only
 * local-path entry removed), packs it, checks the packed manifest, installs
 * the tarball into a clean consumer directory outside the checkout and runs
 * the installed binary.
 *
 * It runs as npm's prepublishOnly hook, so a publish can never ship an
 * artifact that a consumer cannot install.
 */
import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const LOCAL_SPEC = /^(file:|link:|workspace:|\.{1,2}\/|\/)/
const DEP_FIELDS = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']

/**
 * Run a command and return its stdout.
 *
 * @param {string} cmd executable to run
 * @param {string[]} args arguments passed to the executable
 * @param {object} [opts] extra options forwarded to execFileSync
 * @returns {string} captured stdout
 */
function run(cmd, args, opts = {}) {
  return execFileSync(cmd, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...opts,
  })
}

/**
 * Fail when a manifest points at a path that only exists on this machine.
 *
 * @param {Record<string, Record<string, string>>} manifest parsed package manifest
 * @param {string} label human readable description of the manifest source
 * @returns {void}
 */
function assertNoLocalSpecs(manifest, label) {
  for (const field of DEP_FIELDS) {
    for (const [name, spec] of Object.entries(manifest[field] ?? {})) {
      if (LOCAL_SPEC.test(String(spec))) {
        throw new Error(`${label} ${field}.${name} points at a local path: ${spec}`)
      }
    }
  }
}

/**
 * Run the installed CLI binary and return its output.
 *
 * npm installs a POSIX shim on unix and a `.cmd` shim on Windows. Node
 * refuses to execute `.cmd` files directly, so on Windows the shim is
 * launched through the command interpreter with every argument quoted, which
 * keeps the argument boundaries intact. Other platforms keep the direct
 * execution path.
 *
 * @param {string} binPath path of the installed bin shim
 * @param {string[]} args arguments to pass to the CLI
 * @returns {string} captured stdout of the CLI
 */
function runInstalledCli(binPath, args) {
  if (process.platform === 'win32') {
    const shell = process.env.ComSpec || 'cmd.exe'
    const quoted = args.map((arg) => '"' + arg + '"').join(' ')
    return run(shell, ['/d', '/s', '/c', '"' + binPath + '" ' + quoted])
  }
  return run(binPath, args)
}

const tmp = mkdtempSync(join(tmpdir(), 'cli-publish-'))
try {
  const stage = join(tmp, 'package')
  mkdirSync(stage)

  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  if (pkg.devDependencies?.['@7n7d/sdk']) delete pkg.devDependencies['@7n7d/sdk']
  assertNoLocalSpecs(pkg, 'release manifest')
  writeFileSync(join(stage, 'package.json'), JSON.stringify(pkg, null, 2) + '\n')

  cpSync(join(root, 'dist'), join(stage, 'dist'), { recursive: true })
  cpSync(join(root, 'scripts'), join(stage, 'scripts'), { recursive: true })
  for (const file of ['README.md', 'LICENSE']) {
    if (existsSync(join(root, file))) cpSync(join(root, file), join(stage, file))
  }

  const packed = run('npm', ['pack', '--pack-destination', tmp, '--silent'], { cwd: stage })
  const tarball = join(tmp, packed.trim().split('\n').pop().trim())

  const manifestInTarball = JSON.parse(run('tar', ['-xzOf', tarball, 'package/package.json']))
  assertNoLocalSpecs(manifestInTarball, 'packed manifest')

  const consumer = join(tmp, 'consumer')
  mkdirSync(consumer)
  writeFileSync(
    join(consumer, 'package.json'),
    JSON.stringify({ name: 'cli-publish-consumer', private: true, version: '0.0.0' }) + '\n',
  )
  run('npm', ['install', tarball, '--omit=dev', '--no-audit', '--no-fund'], { cwd: consumer })

  const bin = join(consumer, 'node_modules', '.bin', process.platform === 'win32' ? '7n7d.cmd' : '7n7d')
  const help = runInstalledCli(bin, ['--help'])
  for (const command of ['balance', 'status', 'deposit', 'withdraw', 'approve']) {
    if (!help.includes(command)) throw new Error(`installed CLI did not list ${command}`)
  }

  console.log('publishable artifact verified: ' + basename(tarball))
} finally {
  rmSync(tmp, { recursive: true, force: true })
}
