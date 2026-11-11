export interface InvocationOptions {
  windowsVerbatimArguments?: boolean
}

export interface Invocation {
  file: string
  args: string[]
  options: InvocationOptions
}

export interface ResolveInvocationOptions {
  platform?: NodeJS.Platform
  comspec?: string | undefined
  execPath?: string | undefined
  npmExecPath?: string | undefined
}

export type CommandRunner = (
  command: string,
  args?: string[],
  opts?: Record<string, unknown>,
) => string

export interface CreateRunnerOptions {
  platform?: NodeJS.Platform
  comspec?: string | undefined
  execPath?: string | undefined
  npmExecPath?: string | undefined
  exec?: (
    file: string,
    args: string[],
    opts: Record<string, unknown>,
  ) => string
}

export declare function resolveInvocation(
  command: string,
  args?: string[],
  options?: ResolveInvocationOptions,
): Invocation

export declare function createRunner(options?: CreateRunnerOptions): CommandRunner

export declare function runCommand(
  command: string,
  args: string[],
  opts?: Record<string, unknown>,
): string
