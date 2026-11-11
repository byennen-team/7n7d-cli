import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@7n7d/sdk', async () => {
  const { SdkDouble } = await import('../helpers/sdk-double')
  return { SevenNSevenD: SdkDouble }
})

vi.mock('ora', async () => {
  const { oraDouble } = await import('../helpers/doubles')
  return { default: oraDouble }
})

vi.mock('dotenv', async () => {
  const { dotenvDouble } = await import('../helpers/doubles')
  return { default: dotenvDouble }
})

import { createProgram } from '../../cli.js'
import { sdkDouble } from '../helpers/sdk-double'
import {
  captureConsole,
  ExitSentinel,
  installExitSentinel,
  TEST_ADDRESS,
  TEST_PRIVATE_KEY,
  TEST_RPC_URL,
  TEST_WALLET_ADDRESS,
} from '../helpers/harness'

describe('balance command', () => {
  let capture: ReturnType<typeof captureConsole>
  let exits: ReturnType<typeof installExitSentinel>

  beforeEach(() => {
    sdkDouble.reset()
    capture = captureConsole()
    exits = installExitSentinel()
    vi.stubEnv('PRIVATE_KEY', '')
    // Pin the RPC URL so the preflight path does not depend on the
    // developer's own environment.
    vi.stubEnv('RPC_URL', '')
  })

  afterEach(() => {
    exits.restore()
    capture.restore()
    vi.unstubAllEnvs()
  })

  it('fetches balances for an explicit address', async () => {
    const program = createProgram()
    await program.parseAsync(['--rpc-url', TEST_RPC_URL, 'balance', TEST_ADDRESS], { from: 'user' })

    expect(sdkDouble.callArgs('vault.getBalance')).toEqual([[TEST_ADDRESS]])
    expect(sdkDouble.callArgs('token.getBalance')).toEqual([[TEST_ADDRESS]])
    expect(capture.logs.join('\n')).toContain('Vault Position')
    expect(capture.logs.join('\n')).toContain(TEST_ADDRESS)
    expect(exits.codes).toEqual([])
  })

  it('falls back to the wallet address when no argument is given', async () => {
    vi.stubEnv('PRIVATE_KEY', TEST_PRIVATE_KEY)

    const program = createProgram()
    await program.parseAsync(['--rpc-url', TEST_RPC_URL, 'balance'], { from: 'user' })

    expect(sdkDouble.callArgs('vault.getBalance')).toEqual([[TEST_WALLET_ADDRESS]])
    expect(sdkDouble.callArgs('token.getBalance')).toEqual([[TEST_WALLET_ADDRESS]])
    expect(capture.logs.join('\n')).toContain('Vault Position')
  })

  it('prefers the explicit address over the wallet address', async () => {
    vi.stubEnv('PRIVATE_KEY', TEST_PRIVATE_KEY)

    const program = createProgram()
    await program.parseAsync(['--rpc-url', TEST_RPC_URL, 'balance', TEST_ADDRESS], { from: 'user' })

    expect(sdkDouble.callArgs('vault.getBalance')).toEqual([[TEST_ADDRESS]])
    expect(sdkDouble.callArgs('token.getBalance')).toEqual([[TEST_ADDRESS]])
  })

  it('exits when neither an address nor a wallet is available', async () => {
    const program = createProgram()

    await expect(
      program.parseAsync(['--rpc-url', TEST_RPC_URL, 'balance'], { from: 'user' }),
    ).rejects.toBeInstanceOf(ExitSentinel)

    expect(exits.codes).toEqual([1])
    expect(capture.errors.join('\n')).toContain('Provide an address argument or set a private key')
    expect(sdkDouble.callCount('vault.getBalance')).toBe(0)
    expect(sdkDouble.callCount('token.getBalance')).toBe(0)
  })

  it('rejects on the preflight failure when no RPC URL is configured', async () => {
    const program = createProgram()

    await expect(program.parseAsync(['balance'], { from: 'user' })).rejects.toThrow(/RPC URL required/)

    expect(exits.codes).toEqual([])
    expect(capture.errors).toEqual([])
    expect(sdkDouble.callCount('vault.getBalance')).toBe(0)
  })

  it('reports a failed balance fetch and exits', async () => {
    sdkDouble.overrides['vault.getBalance'] = async () => {
      throw new Error('rpc down')
    }

    const program = createProgram()

    await expect(
      program.parseAsync(['--rpc-url', TEST_RPC_URL, 'balance', TEST_ADDRESS], { from: 'user' }),
    ).rejects.toBeInstanceOf(ExitSentinel)

    expect(exits.codes).toEqual([1])
    expect(capture.errors.join('\n')).toContain('rpc down')
    expect(sdkDouble.callArgs('vault.getBalance')).toEqual([[TEST_ADDRESS]])
  })
})
