import { describe, expect, it } from 'vitest'
import { resolveInvocation } from '../../scripts/lib/exec.mjs'

/**
 * npm ships as `npm.cmd` on Windows and Node cannot execute a `.cmd` file
 * directly, so the release verification must route it through the command
 * interpreter. `tar` is a real executable and must keep running directly.
 */
describe('resolveInvocation', () => {
  it('runs native executables directly off Windows', () => {
    expect(resolveInvocation('tar', ['-xzOf', 'pkg.tgz'], { platform: 'linux' })).toEqual({
      file: 'tar',
      args: ['-xzOf', 'pkg.tgz'],
      options: {},
    })
  })

  it('routes npm through the command interpreter on Windows', () => {
    const plan = resolveInvocation('npm', ['pack', '--silent'], {
      platform: 'win32',
      execPath: 'C:\\Program Files\\nodejs\\node.exe',
      npmExecPath: undefined,
    })

    expect(plan.file).toBe('cmd.exe')
    expect(plan.args.slice(0, 4)).toEqual(['/d', '/s', '/v:off', '/c'])
    expect(plan.args[4]).toBe('""npm.cmd" "pack" "--silent""')
    expect(plan.options).toEqual({ windowsVerbatimArguments: true })
  })

  it('prefers npm\'s JavaScript entry point over the Windows shim', () => {
    const plan = resolveInvocation('npm', ['install', 'x.tgz'], {
      platform: 'win32',
      execPath: 'C:\\Program Files\\nodejs\\node.exe',
      npmExecPath: 'C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js',
    })

    expect(plan.file).toBe('C:\\Program Files\\nodejs\\node.exe')
    expect(plan.args).toEqual([
      'C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js',
      'install',
      'x.tgz',
    ])
    expect(plan.options).toEqual({})
  })

  it('uses ComSpec when the environment provides it', () => {
    const plan = resolveInvocation('npm', ['install', 'x.tgz'], {
      platform: 'win32',
      comspec: 'C:\\Windows\\System32\\cmd.exe',
      execPath: 'C:\\nodejs\\node.exe',
      npmExecPath: undefined,
    })

    expect(plan.file).toBe('C:\\Windows\\System32\\cmd.exe')
    expect(plan.args[4]).toBe('""npm.cmd" "install" "x.tgz""')
  })

  it('quotes every token so paths with spaces survive', () => {
    const plan = resolveInvocation('npm', ['pack', '--pack-destination', 'C:\\tmp dir'], {
      platform: 'win32',
      execPath: 'C:\\nodejs\\node.exe',
      npmExecPath: undefined,
    })

    expect(plan.args[4]).toBe('""npm.cmd" "pack" "--pack-destination" "C:\\tmp dir""')
  })

  it('routes an installed .cmd shim through the command interpreter', () => {
    const plan = resolveInvocation('C:\\tmp dir\\node_modules\\.bin\\7n7d.cmd', ['--help'], {
      platform: 'win32',
    })

    expect(plan.file).toBe('cmd.exe')
    expect(plan.args[4]).toBe(
      '""C:\\tmp dir\\node_modules\\.bin\\7n7d.cmd" "--help""',
    )
    expect(plan.options).toEqual({ windowsVerbatimArguments: true })
  })

  it('keeps the installed shim executable directly off Windows', () => {
    expect(
      resolveInvocation('/tmp/consumer/node_modules/.bin/7n7d', ['--help'], {
        platform: 'darwin',
      }),
    ).toEqual({
      file: '/tmp/consumer/node_modules/.bin/7n7d',
      args: ['--help'],
      options: {},
    })
  })

  it('refuses tokens that the command interpreter would mangle', () => {
    const win = { platform: 'win32' as const, execPath: 'C:\\nodejs\\node.exe', npmExecPath: undefined }

    expect(() => resolveInvocation('npm', ['pack', 'a"b'], win)).toThrow(/unsupported character/i)
    expect(() => resolveInvocation('npm', ['pack', 'a\nb'], win)).toThrow(/unsupported character/i)
    expect(() => resolveInvocation('npm', ['pack', '%PATH%'], win)).toThrow(/unsupported character/i)
    expect(() => resolveInvocation('npm', ['pack', 'C:\\dir\\'], win)).toThrow(/unsupported/i)
    expect(() => resolveInvocation('npm', ['pack', ''], win)).toThrow(/unsupported empty argument/i)
  })
})
