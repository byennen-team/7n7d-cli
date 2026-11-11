/**
 * Prove that the CLI can actually be published and installed.
 *
 * @7n7d/sdk is not on npm, so it cannot be a runtime dependency of the
 * published package: it is bundled into dist/ and kept as a build-only
 * devDependency. This module stages the release manifest (the build-only
 * local-path entry removed), packs it, checks the packed manifest, installs
 * the tarball into a clean consumer directory outside the checkout and runs
 * the installed binary.
 *
 * Every external command goes through the injected runner, which resolves the
 * platform specific way to launch it (npm is a `.cmd` shim on Windows).
 */
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join, resolve } from 'node:path'

const LOCAL_SPEC = /^(file:|link:|workspace:|\.{1,2}\/|\/)/u
const DEP_FIELDS = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']

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
 * Verify the publishable artifact end to end.
 *
 * @param {object} options verification options
 * @param {Function} options.run runner used for every external command
 * @param {string} [options.root] repository root, defaults to the package root
 * @param {string} [options.tmpDir] parent directory for the scratch directory
 * @param {string} [options.platform] platform to resolve commands for
 * @returns {string} name of the packed tarball
 */
export function verifyPublishable({ run, root = resolve(import.meta.dirname, '..', '..'), tmpDir = tmpdir(), platform = process.platform }) {
  const tmp = mkdtempSync(join(tmpDir, 'cli-publish-'))
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

    const bin = join(consumer, 'node_modules', '.bin', platform === 'win32' ? '7n7d.cmd' : '7n7d')
    const help = run(bin, ['--help'])
    for (const command of ['balance', 'status', 'deposit', 'withdraw', 'approve']) {
      if (!help.includes(command)) throw new Error(`installed CLI did not list ${command}`)
    }

    return basename(tarball)
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
}
