import { vi } from 'vitest'

/** Remove ANSI colour sequences so assertions are environment independent. */
export function stripAnsi(value: string): string {
  return value.replace(/\x1B\[[0-9;]*m/g, '')
}

/**
 * Poll until a condition holds.
 *
 * Used where an action is parked on a promise the test controls: the test
 * needs to observe the state *while* that promise is still unresolved.
 */
export async function waitFor(condition: () => boolean, timeoutMs = 2_000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (!condition()) {
    if (Date.now() > deadline) {
      throw new Error('timed out waiting for condition')
    }
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
}

export class ExitSentinel extends Error {
  readonly exitCode: number

  constructor(code: number) {
    super(`process.exit(${code})`)
    this.name = 'ExitSentinel'
    this.exitCode = code
  }
}

/**
 * Replace `process.exit` with a throwing sentinel.
 *
 * A returning mock would let execution continue past the exit point and
 * issue further SDK calls, which is exactly the behaviour the real CLI
 * never has.
 */
export function installExitSentinel(): { codes: number[]; restore: () => void } {
  const codes: number[] = []
  const spy = vi.spyOn(process, 'exit').mockImplementation(((
    code?: number | string | null,
  ) => {
    const numeric = typeof code === 'number' ? code : 0
    codes.push(numeric)
    throw new ExitSentinel(numeric)
  }) as never)

  return {
    codes,
    restore: () => spy.mockRestore(),
  }
}

export interface ConsoleCapture {
  logs: string[]
  errors: string[]
  restore: () => void
}

/** Capture console output instead of writing it to the test reporter. */
export function captureConsole(): ConsoleCapture {
  const logs: string[] = []
  const errors: string[] = []

  const logSpy = vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
    logs.push(stripAnsi(args.map((arg) => String(arg)).join(' ')))
  })
  const errorSpy = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    errors.push(stripAnsi(args.map((arg) => String(arg)).join(' ')))
  })

  return {
    logs,
    errors,
    restore: () => {
      logSpy.mockRestore()
      errorSpy.mockRestore()
    },
  }
}

/** A syntactically valid 32-byte private key for wallet-present scenarios. */
export const TEST_PRIVATE_KEY = `0x${'11'.repeat(32)}`

/** An explicitly supplied address, distinct from the mocked wallet address. */
export const TEST_ADDRESS = `0x${'1'.repeat(40)}`

/** The address the SDK double derives from `TEST_PRIVATE_KEY`. */
export const TEST_WALLET_ADDRESS = `0x${'2'.repeat(40)}`

export const TEST_RPC_URL = 'http://127.0.0.1:8545'
