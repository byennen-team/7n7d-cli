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
  TEST_WALLET_ADDRESS,
  waitFor,
} from '../helpers/harness'

const BASE = ['--rpc-url', TEST_RPC_URL, 'withdraw', '10']

/**
 * The real SDK returns pending shares as base units (18 decimals), so one
 * share is 10^18. The CLI prints `withdrawalInfo.shares.toString()` without
 * formatting them.
 */
const ONE_SHARE = 10n ** 18n

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
    vi.stubEnv('RPC_URL', '')
  })

  afterEach(() => {
    exits.restore()
    capture.restore()
    vi.unstubAllEnvs()
  })

  it('requests the given number of shares after confirmation', async () => {
    promptDouble.mockResolvedValue({ confirm: true })

    const program = createProgram()
    await program.parseAsync(BASE, { from: 'user' })

    expect(sdkDouble.callArgs('vault.withdraw')).toEqual([['10']])
    expect(sdkDouble.callCount('vault.withdraw')).toBe(1)
    expect(spinnerDouble.succeed).toHaveBeenCalledWith('Withdrawal requested')
    expect(exits.codes).toEqual([])
  })

  it('reads the balance and withdrawal info for the wallet address', async () => {
    promptDouble.mockResolvedValue({ confirm: true })

    const program = createProgram()
    await program.parseAsync(BASE, { from: 'user' })

    expect(sdkDouble.callArgs('vault.getBalance')).toEqual([[TEST_WALLET_ADDRESS]])
    expect(sdkDouble.callArgs('vault.getWithdrawalInfo')).toEqual([[TEST_WALLET_ADDRESS]])
  })

  it('estimates the USDC value from shares and share price', async () => {
    sdkDouble.overrides['vault.getSharePrice'] = async () => '1.25'
    promptDouble.mockResolvedValue({ confirm: true })

    const program = createProgram()
    await program.parseAsync(BASE, { from: 'user' })

    expect(capture.logs.join('\n')).toContain('12.50')
  })

  it('estimates a fractional share amount', async () => {
    sdkDouble.overrides['vault.getSharePrice'] = async () => '1.25'
    promptDouble.mockResolvedValue({ confirm: true })

    const program = createProgram()
    await program.parseAsync(
      ['--rpc-url', TEST_RPC_URL, 'withdraw', '10.5'],
      { from: 'user' },
    )

    expect(capture.logs.join('\n')).toContain('13.13')
    // The fractional amount is forwarded to the SDK unchanged.
    expect(sdkDouble.callArgs('vault.withdraw')).toEqual([['10.5']])
  })

  it('omits the pending notice when no withdrawal is pending', async () => {
    promptDouble.mockResolvedValue({ confirm: true })

    const program = createProgram()
    await program.parseAsync(BASE, { from: 'user' })

    expect(capture.logs.join('\n')).not.toContain('You have a pending withdrawal')
  })

  it('reports a pending withdrawal that is ready', async () => {
    sdkDouble.overrides['vault.getWithdrawalInfo'] = async () => ({
      shares: 5n * ONE_SHARE,
      assets: 5n * ONE_SHARE,
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
      shares: 5n * ONE_SHARE,
      assets: 5n * ONE_SHARE,
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

  // Known display defect, pinned deliberately: the pending-share figure is
  // printed as the raw base-unit bigint rather than a formatted share count,
  // so 5 shares renders as 5000000000000000000. This test exists to make the
  // defect visible and to force an update when it is fixed.
  it('prints pending shares as raw base units (known display defect)', async () => {
    sdkDouble.overrides['vault.getWithdrawalInfo'] = async () => ({
      shares: 5n * ONE_SHARE,
      assets: 5n * ONE_SHARE,
      unlockTime: 0n,
      isReady: true,
    })
    promptDouble.mockResolvedValue({ confirm: true })

    const program = createProgram()
    await program.parseAsync(BASE, { from: 'user' })

    expect(capture.logs.join('\n')).toContain('5000000000000000000 shares')
  })

  it('does not withdraw while the confirmation is still pending', async () => {
    let resolvePrompt: (value: { confirm: boolean }) => void = () => {}
    promptDouble.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePrompt = resolve
        }),
    )

    const program = createProgram()
    let failure: unknown
    // Capture a rejection immediately: if the command fails before the
    // prompt settles, an un-awaited rejection would surface as an unhandled
    // rejection diagnostic instead of a test failure.
    const pending = program.parseAsync(BASE, { from: 'user' }).catch((error) => {
      failure = error
    })

    await waitFor(() => promptDouble.mock.calls.length > 0)
    expect(sdkDouble.calledTransaction()).toBe(false)

    resolvePrompt({ confirm: true })
    await pending
    expect(failure).toBeUndefined()
    expect(sdkDouble.callArgs('vault.withdraw')).toEqual([['10']])
  })

  it('cancels without any transaction', async () => {
    promptDouble.mockResolvedValue({ confirm: false })

    const program = createProgram()
    await program.parseAsync(BASE, { from: 'user' })

    expect(sdkDouble.callCount('vault.withdraw')).toBe(0)
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
    expect(sdkDouble.calledTransaction()).toBe(false)
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
    expect(sdkDouble.callArgs('vault.withdraw')).toEqual([['10']])
  })
})
