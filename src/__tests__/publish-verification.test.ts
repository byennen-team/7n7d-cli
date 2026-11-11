import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createRunner } from '../../scripts/lib/exec.mjs'
import { verifyPublishable } from '../../scripts/lib/publish-verification.mjs'

interface Call {
  command: string
  args: string[]
  opts: Record<string, unknown>
}

/**
 * The release verification must launch every external command through the
 * shared runner, so npm (a `.cmd` shim on Windows) and the installed CLI are
 * launched the way the platform needs, while tar stays a direct call.
 */
describe('verifyPublishable', () => {
  it('runs npm pack, npm install, tar and the installed CLI through the runner', () => {
    const calls: Call[] = []
    const run = (command: string, args: string[] = [], opts: Record<string, unknown> = {}) => {
      calls.push({ command, args, opts })
      if (command === 'npm' && args[0] === 'pack') return '7n7d-1.0.0.tgz\n'
      if (command === 'tar') return JSON.stringify({ name: '7n7d', version: '1.0.0' })
      if (command === 'npm') return ''
      return 'balance status deposit withdraw approve'
    }

    const tarball = verifyPublishable({ run })

    expect(tarball).toBe('7n7d-1.0.0.tgz')
    expect(calls.map((call) => call.command)).toEqual([
      'npm',
      'tar',
      'npm',
      expect.stringContaining('node_modules'),
    ])
    expect(calls[0].args[0]).toBe('pack')
    expect(calls[0].opts.cwd).toBeDefined()
    expect(calls[1].args[0]).toBe('-xzOf')
    expect(calls[2].args[0]).toBe('install')
    expect(calls[2].opts.cwd).toBeDefined()
    expect(calls[3].args).toEqual(['--help'])
  })

  it('fails when the installed CLI does not list a command', () => {
    const run = (command: string, args: string[] = []) => {
      if (command === 'npm' && args[0] === 'pack') return '7n7d-1.0.0.tgz\n'
      if (command === 'tar') return JSON.stringify({ name: '7n7d', version: '1.0.0' })
      return 'balance status'
    }

    expect(() => verifyPublishable({ run })).toThrow(/did not list deposit/u)
  })

  it('routes npm and the installed .cmd shim through the command interpreter on Windows', () => {
    const spawned: { file: string; args: string[]; opts: Record<string, unknown> }[] = []
    const exec = (file: string, args: string[], opts: Record<string, unknown>) => {
      spawned.push({ file, args, opts })
      // The interpreter arguments start with /d, so the npm sub-command is
      // recognised from the command line the runner assembled.
      const commandLine = args[args.length - 1] ?? ''
      if (file === 'cmd.exe' && commandLine.includes('"pack"')) return '7n7d-1.0.0.tgz\n'
      if (file === 'cmd.exe' && commandLine.includes('"install"')) return ''
      if (file === 'tar') return JSON.stringify({ name: '7n7d', version: '1.0.0' })
      return 'balance status deposit withdraw approve'
    }
    const run = createRunner({
      platform: 'win32',
      comspec: undefined,
      execPath: 'C:\\nodejs\\node.exe',
      npmExecPath: undefined,
      exec,
    })

    verifyPublishable({ run, platform: 'win32' })

    const npmCalls = spawned.filter((call) => call.args.some((arg) => arg.includes('npm.cmd')))
    expect(npmCalls).toHaveLength(2)
    for (const call of npmCalls) {
      expect(call.file).toBe('cmd.exe')
      expect(call.opts.windowsVerbatimArguments).toBe(true)
      expect(call.args.slice(0, 4)).toEqual(['/d', '/s', '/v:off', '/c'])
    }

    // tar is a real executable and must not be pushed through the shell.
    const tarCall = spawned.find((call) => call.args[0] === '-xzOf')
    expect(tarCall?.file).toBe('tar')
    expect(tarCall?.opts.windowsVerbatimArguments).toBeUndefined()

    // The packed tarball has to travel from npm pack to tar and npm install:
    // npm pack prints the tarball name, which is then unpacked and installed.
    const packCall = npmCalls.find((call) => call.args[4].includes('"pack"'))
    expect(packCall?.args[4]).toContain('"--pack-destination"')
    expect(tarCall?.args[1]).toContain('7n7d-1.0.0.tgz')
    const installCall = npmCalls.find((call) => call.args[4].includes('"install"'))
    expect(installCall?.args[4]).toContain('7n7d-1.0.0.tgz')

    // The installed binary is a .cmd shim on Windows.
    const cliCall = spawned.find((call) => call.args.some((arg) => arg.includes('--help')))
    expect(cliCall?.file).toBe('cmd.exe')
    expect(cliCall?.args[4]).toContain('7n7d.cmd')
  })

  it('rejects a packed manifest that still points at a local path', () => {
    const root = mkdtempSync(join(tmpdir(), 'cli-verify-root-'))
    mkdirSync(join(root, 'dist'))
    mkdirSync(join(root, 'scripts'))
    writeFileSync(
      join(root, 'package.json'),
      JSON.stringify({ name: '7n7d', version: '1.0.0' }),
    )

    try {
      expect(() =>
        verifyPublishable({
          run: (command: string, args: string[] = []) => {
            if (command === 'npm' && args[0] === 'pack') return '7n7d-1.0.0.tgz\n'
            if (command === 'tar') {
              return JSON.stringify({
                name: '7n7d',
                version: '1.0.0',
                dependencies: { '@7n7d/sdk': 'file:../7n7d-sdk' },
              })
            }
            return ''
          },
          root,
        }),
      ).toThrow(/packed manifest dependencies\.@7n7d\/sdk points at a local path/u)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('stages the real manifest so the prepack transform is exercised', () => {
    const root = mkdtempSync(join(tmpdir(), 'cli-verify-stage-'))
    mkdirSync(join(root, 'dist'))
    mkdirSync(join(root, 'scripts'))
    writeFileSync(
      join(root, 'package.json'),
      JSON.stringify({
        name: '7n7d',
        version: '1.0.0',
        devDependencies: { '@7n7d/sdk': 'file:../7n7d-sdk' },
        scripts: { prepack: 'node scripts/prepare-release-manifest.mjs' },
      }),
    )

    let staged: Record<string, unknown> | undefined
    try {
      verifyPublishable({
        run: (command: string, args: string[] = [], opts: Record<string, unknown> = {}) => {
          if (command === 'npm' && args[0] === 'pack') {
            staged = JSON.parse(
              readFileSync(join(String(opts.cwd), 'package.json'), 'utf8'),
            )
            return '7n7d-1.0.0.tgz\n'
          }
          if (command === 'tar') return JSON.stringify({ name: '7n7d', version: '1.0.0' })
          return 'balance status deposit withdraw approve'
        },
        root,
      })

      // The staged manifest must still carry the local-path devDependency, so
      // the staged prepack script performs the real release transform.
      expect(
        (staged?.devDependencies as Record<string, string>)['@7n7d/sdk'],
      ).toBe('file:../7n7d-sdk')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('removes the scratch directory when a command fails', () => {
    const scratch = mkdtempSync(join(tmpdir(), 'cli-verify-scratch-'))
    try {
      expect(() =>
        verifyPublishable({
          run: (command: string, args: string[] = []) => {
            if (command === 'npm' && args[0] === 'pack') throw new Error('pack failed')
            return ''
          },
          tmpDir: scratch,
        }),
      ).toThrow(/pack failed/u)
      expect(readdirSync(scratch)).toEqual([])
    } finally {
      rmSync(scratch, { recursive: true, force: true })
    }
  })

  it('propagates a failing command', () => {
    const run = (command: string, args: string[] = []) => {
      if (command === 'npm' && args[0] === 'pack') throw new Error('pack failed')
      return ''
    }

    expect(() => verifyPublishable({ run })).toThrow(/pack failed/u)
  })
})
