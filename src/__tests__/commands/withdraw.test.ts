import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@7n7d/sdk', async () => {
  const { SdkDouble } = await import('../helpers/sdk-double')
  return { SevenNSevenD: SdkDouble }
})

vi.mock('ora', async () => {
  const { oraDouble } = await import('../helpers/doubles')
  return { default: oraDouble }
})

vi.mock('inquirer', async () => {
  const { promptDouble } = await import('../helpers/doubles')
  return { default: { prompt: promptDouble } }
})

vi.mock('dotenv', async () => {
  const { dotenvDouble } = await import('../helpers/doubles')
  return { default: dotenvDouble }
})

import { createProgram } from '../../cli.js'
import { promptDouble, spinnerDouble } from '../helpers/doubles'
import { sdkDouble } from '../helpers/sdk-double'
import {
  captureConsole,
  ExitSentinel,
  installExitSentinel,
  TEST_PRIVATE_KEY,
  TEST_RPC_URL,
} from '../helpers/harness'

const BASE = ['--rpc-url', TEST_RPC_URL, 'withdraw', '10']

describe('withdraw command', () => {
  let capture: ReturnType<typeof captureConsole>
  let exits: ReturnType<typeof installExitSentinel>

  beforeEach(() => {
    sdkDouble.reset()
    promptDouble.mockReset()
    spinnerDouble.succeed.mockClear()
    spinnerDouble.fail.mockClear()
    capture = captureConsole()
    exits = installExitSentinel()
    vi.stubEnv('PRIVATE_KEY', TEST_PRIVATE_KEY)
  })

  afterEach(() => {
    exits.restore()
    capture.restore()
    vi.unstubAllEnvs()
  })

  it('requests a withdrawal after confirmation', async () => {
    promptDouble.mockResolvedValue({ confirm: true })

    const program = createProgram()
    await program.parseAsync(BASE, { from: 'user' })

    expect(sdkDouble.callLog()).toContain('vault.withdraw')
    expect(spinnerDouble.succeed).toHaveBeenCalledWith('Withdrawal requested')
    expect(exits.codes).toEqual([])
  })

  it('estimates the USDC value from shares and share price', async () => {
    sdkDouble.overrides['vault.getSharePrice'] = async () => '1.25'
    promptDouble.mockResolvedValue({ confirm: true })

    const program = createProgram()
    await program.parseAsync(BASE, { from: 'user' })

    expect(capture.logs.join('\n')).toContain('12.50')
  })

  it('omits the pending notice when no withdrawal is pending', async () => {
    promptDouble.mockResolvedValue({ confirm: true })

    const program = createProgram()
    await program.parseAsync(BASE, { from: 'user' })

    expect(capture.logs.join('\n')).not.toContain('You have a pending withdrawal')
  })

  it('reports a pending withdrawal that is ready', async () => {
    sdkDouble.overrides['vault.getWithdrawalInfo'] = async () => ({
      shares: 5n,
      assets: 5n,
      unlockTime: 0n,
      isReady: true,
    })
    promptDouble.mockResolvedValue({ confirm: true })

    const program = createProgram()
    await program.parseAsync(BASE, { from: 'user' })

    const output = capture.logs.join('\n')
    expect(output).toContain('You have a pending withdrawal')
    expect(output).toContain('Pending Shares')
    expect(output).toContain('Yes')
  })

  it('reports a pending withdrawal that is not ready yet', async () => {
    sdkDouble.overrides['vault.getWithdrawalInfo'] = async () => ({
      shares: 5n,
      assets: 5n,
      unlockTime: 123n,
      isReady: false,
    })
    promptDouble.mockResolvedValue({ confirm: true })

    const program = createProgram()
    await program.parseAsync(BASE, { from: 'user' })

    const output = capture.logs.join('\n')
    expect(output).toContain('You have a pending withdrawal')
    expect(output).toContain('No')
  })

  it('cancels without any transaction', async () => {
    promptDouble.mockResolvedValue({ confirm: false })

    const program = createProgram()
    await program.parseAsync(BASE, { from: 'user' })

    expect(sdkDouble.calledTransaction()).toBe(false)
    expect(capture.logs.join('\n')).toContain('Cancelled')
  })

  it('rejects on the preflight failure when no wallet is available', async () => {
    vi.stubEnv('PRIVATE_KEY', '')

    const program = createProgram()

    await expect(
      program.parseAsync(['--rpc-url', TEST_RPC_URL, 'withdraw', '10'], { from: 'user' }),
    ).rejects.toThrow(/Private key required/)

    expect(exits.codes).toEqual([])
  })

  it('reports a failed withdrawal and exits', async () => {
    sdkDouble.overrides['vault.withdraw'] = async () => {
      throw new Error('withdraw failed')
    }
    promptDouble.mockResolvedValue({ confirm: true })

    const program = createProgram()

    await expect(program.parseAsync(BASE, { from: 'user' })).rejects.toBeInstanceOf(ExitSentinel)

    expect(exits.codes).toEqual([1])
    expect(capture.errors.join('\n')).toContain('withdraw failed')
  })
})
