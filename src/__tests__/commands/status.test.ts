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
  TEST_PRIVATE_KEY,
  TEST_RPC_URL,
} from '../helpers/harness'

describe('status command', () => {
  let capture: ReturnType<typeof captureConsole>
  let exits: ReturnType<typeof installExitSentinel>

  beforeEach(() => {
    sdkDouble.reset()
    capture = captureConsole()
    exits = installExitSentinel()
    vi.stubEnv('PRIVATE_KEY', '')
  })

  afterEach(() => {
    exits.restore()
    capture.restore()
    vi.unstubAllEnvs()
  })

  it('shows the vault overview without a wallet', async () => {
    const program = createProgram()
    await program.parseAsync(['--rpc-url', TEST_RPC_URL, 'status'], { from: 'user' })

    const output = capture.logs.join('\n')
    expect(output).toContain('Vault Overview')
    expect(output).toContain('Set a private key to see your position')
    expect(output).not.toContain('Your Position')
    expect(exits.codes).toEqual([])
  })

  it('shows the wallet position when PRIVATE_KEY is set', async () => {
    vi.stubEnv('PRIVATE_KEY', TEST_PRIVATE_KEY)

    const program = createProgram()
    await program.parseAsync(['--rpc-url', TEST_RPC_URL, 'status'], { from: 'user' })

    const output = capture.logs.join('\n')
    expect(output).toContain('Your Position')
    expect(output).not.toContain('Set a private key to see your position')
  })

  it('reports a failed status fetch and exits', async () => {
    sdkDouble.overrides['vault.getTVL'] = async () => {
      throw new Error('rpc down')
    }

    const program = createProgram()

    await expect(
      program.parseAsync(['--rpc-url', TEST_RPC_URL, 'status'], { from: 'user' }),
    ).rejects.toBeInstanceOf(ExitSentinel)

    expect(exits.codes).toEqual([1])
    expect(capture.errors.join('\n')).toContain('rpc down')
  })
})
