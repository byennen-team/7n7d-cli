/**
 * Launch helpers that work on every platform.
 *
 * npm ships as `npm.cmd` on Windows and npm-installed binaries get a `.cmd`
 * shim as well. Node cannot execute a `.cmd` file directly, so those shims are
 * launched through the Windows command interpreter. Everything else (tar,
 * node, ...) is a real executable and keeps running directly.
 *
 * The command interpreter receives the whole command line in one argument and
 * `windowsVerbatimArguments` is set, so Node does not apply CRT-style escaping
 * to the quotes we assemble. `/d` disables AutoRun, `/s` makes the
 * interpreter strip exactly the outer quote pair (leaving every token
 * individually quoted) and `/v:off` keeps delayed expansion - and therefore
 * `!` - literal.
 */
import { execFileSync } from 'node:child_process'

/** Characters the Windows command interpreter would rewrite. */
const UNSUPPORTED = /["\r\n%]/u

/**
 * Resolve the executable, arguments and spawn options for a command.
 *
 * @param {string} command executable to run
 * @param {string[]} [args] arguments for the executable
 * @param {object} [options] resolver options
 * @param {string} [options.platform] platform to resolve for, defaults to the current one
 * @param {string} [options.comspec] command interpreter to use on Windows
 * @param {string} [options.execPath] node executable, used to run npm's JavaScript entry point
 * @param {string} [options.npmExecPath] path of npm's JavaScript entry point
 * @returns {{file: string, args: string[], options: {windowsVerbatimArguments?: boolean}}}
 */
export function resolveInvocation(command, args = [], options = {}) {
  const platform = options.platform ?? process.platform
  // An explicitly passed value wins, including `undefined`, so callers can
  // pin the resolver to one branch regardless of the environment.
  const comspec = 'comspec' in options ? options.comspec : process.env.ComSpec
  const execPath = options.execPath ?? process.execPath
  const npmExecPath =
    'npmExecPath' in options ? options.npmExecPath : process.env.npm_execpath

  if (platform !== 'win32') {
    return { file: command, args: [...args], options: {} }
  }

  // npm is a batch shim on Windows. Running npm's JavaScript entry point with
  // node avoids the shell entirely; the shim is only the fallback when npm
  // did not tell us where its entry point is.
  if (command === 'npm') {
    if (npmExecPath) {
      return { file: execPath, args: [npmExecPath, ...args], options: {} }
    }
    return resolveShim('npm.cmd', args, { comspec })
  }

  // Real executables (tar.exe, node.exe, ...) run directly.
  if (!/\.(cmd|bat)$/iu.test(command)) {
    return { file: command, args: [...args], options: {} }
  }

  return resolveShim(command, args, { comspec })
}

/**
 * Build the command interpreter invocation for a Windows shim.
 *
 * @param {string} executable shim to run
 * @param {string[]} args arguments for the shim
 * @param {object} options resolver options
 * @param {string} [options.comspec] command interpreter to use
 * @returns {{file: string, args: string[], options: {windowsVerbatimArguments?: boolean}}}
 */
function resolveShim(executable, args, options) {
  const tokens = [executable, ...args]
  for (const token of tokens) {
    if (token === '') {
      throw new Error(`unsupported empty argument in command: ${executable}`)
    }
    if (UNSUPPORTED.test(token)) {
      throw new Error(`unsupported character in argument "${token}" of command: ${executable}`)
    }
    if (token.endsWith('\\')) {
      throw new Error(
        `unsupported trailing backslash in argument "${token}" of command: ${executable}`,
      )
    }
  }

  const inner = tokens.map((token) => `"${token}"`).join(' ')
  return {
    file: options.comspec || 'cmd.exe',
    args: ['/d', '/s', '/v:off', '/c', `"${inner}"`],
    options: { windowsVerbatimArguments: true },
  }
}

/**
 * Default process runner.
 *
 * @param {string} file executable to run
 * @param {string[]} args arguments for the executable
 * @param {object} opts spawn options
 * @returns {string} captured stdout
 */
function defaultExec(file, args, opts) {
  return execFileSync(file, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...opts,
  })
}

/**
 * Create a runner that launches commands the way the current platform needs.
 *
 * @param {object} [options] runner options
 * @param {string} [options.platform] platform to resolve for, defaults to the current one
 * @param {string} [options.comspec] command interpreter to use on Windows
 * @param {string} [options.execPath] node executable
 * @param {string} [options.npmExecPath] path of npm's JavaScript entry point
 * @param {Function} [options.exec] process runner, injectable for tests
 * @returns {(command: string, args?: string[], opts?: object) => string} runner
 */
export function createRunner(options = {}) {
  const exec = options.exec ?? defaultExec
  const resolveOptions = {
    platform: options.platform ?? process.platform,
    execPath: options.execPath ?? process.execPath,
  }
  if ('comspec' in options) resolveOptions.comspec = options.comspec
  else if (process.env.ComSpec) resolveOptions.comspec = process.env.ComSpec
  if ('npmExecPath' in options) resolveOptions.npmExecPath = options.npmExecPath
  else if (process.env.npm_execpath) resolveOptions.npmExecPath = process.env.npm_execpath

  return (command, args = [], opts = {}) => {
    const { file, args: resolvedArgs, options: spawnOptions } = resolveInvocation(
      command,
      args,
      resolveOptions,
    )
    return exec(file, resolvedArgs, { ...spawnOptions, ...opts })
  }
}

/**
 * Run a command and return its stdout.
 *
 * @param {string} command executable to run
 * @param {string[]} args arguments for the executable
 * @param {object} [opts] extra options forwarded to the process runner
 * @returns {string} captured stdout
 */
export function runCommand(command, args, opts = {}) {
  return createRunner()(command, args, opts)
}
