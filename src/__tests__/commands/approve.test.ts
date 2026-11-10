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

const BASE = ['--rpc-url', TEST_RPC_URL, 'approve', '1000']

describe('approve command', () => {
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

  it('approves the requested amount after confirmation', async () => {
    promptDouble.mockResolvedValue({ confirm: true })

    const program = createProgram()
    await program.parseAsync(BASE, { from: 'user' })

    expect(sdkDouble.callArgs('vault.approve')).toEqual([['1000']])
    expect(sdkDouble.callCount('vault.approve')).toBe(1)
    expect(spinnerDouble.succeed).toHaveBeenCalledWith('USDC approved')
    expect(capture.logs.join('\n')).toContain('0xapprove')
    expect(exits.codes).toEqual([])
  })

  it('reads the allowance for the wallet address', async () => {
    promptDouble.mockResolvedValue({ confirm: true })

    const program = createProgram()
    await program.parseAsync(BASE, { from: 'user' })

    expect(sdkDouble.callArgs('vault.getAllowance')).toEqual([[TEST_WALLET_ADDRESS]])
  })

  it('shows the current and new allowance before prompting', async () => {
    sdkDouble.overrides['vault.getAllowance'] = async () => '25'
    promptDouble.mockResolvedValue({ confirm: true })

    const program = createProgram()
    await program.parseAsync(BASE, { from: 'user' })

    const output = capture.logs.join('\n')
    expect(output).toContain('Current Allowance')
    expect(output).toContain('25')
    expect(output).toContain('New Allowance')
    expect(output).toContain('1000')
  })

  it('does not approve while the confirmation is still pending', async () => {
    let resolvePrompt: (value: { confirm: boolean }) => void = () => {}
    promptDouble.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePrompt = resolve
        }),
    )

    const program = createProgram()
    const pending = program.parseAsync(BASE, { from: 'user' })

    await waitFor(() => promptDouble.mock.calls.length > 0)
    expect(sdkDouble.calledTransaction()).toBe(false)

    resolvePrompt({ confirm: true })
    await pending
    expect(sdkDouble.callArgs('vault.approve')).toEqual([['1000']])
  })

  it('cancels without any transaction', async () => {
    promptDouble.mockResolvedValue({ confirm: false })

    const program = createProgram()
    await program.parseAsync(BASE, { from: 'user' })

    expect(sdkDouble.callCount('vault.approve')).toBe(0)
    expect(sdkDouble.calledTransaction()).toBe(false)
    expect(capture.logs.join('\n')).toContain('Cancelled')
  })

  it('rejects on the preflight failure when no wallet is available', async () => {
    vi.stubEnv('PRIVATE_KEY', '')

    const program = createProgram()

    await expect(
      program.parseAsync(['--rpc-url', TEST_RPC_URL, 'approve', '1000'], { from: 'user' }),
    ).rejects.toThrow(/Private key required/)

    expect(exits.codes).toEqual([])
    expect(sdkDouble.calledTransaction()).toBe(false)
  })

  it('reports a failed allowance read and exits', async () => {
    sdkDouble.overrides['vault.getAllowance'] = async () => {
      throw new Error('allowance failed')
    }
    promptDouble.mockResolvedValue({ confirm: true })

    const program = createProgram()

    await expect(program.parseAsync(BASE, { from: 'user' })).rejects.toBeInstanceOf(ExitSentinel)

    expect(exits.codes).toEqual([1])
    expect(capture.errors.join('\n')).toContain('allowance failed')
    expect(sdkDouble.calledTransaction()).toBe(false)
  })

  it('reports a failed approval and exits', async () => {
    sdkDouble.overrides['vault.approve'] = async () => {
      throw new Error('approval failed')
    }
    promptDouble.mockResolvedValue({ confirm: true })

    const program = createProgram()

    await expect(program.parseAsync(BASE, { from: 'user' })).rejects.toBeInstanceOf(ExitSentinel)

    expect(exits.codes).toEqual([1])
    expect(capture.errors.join('\n')).toContain('approval failed')
    expect(sdkDouble.callArgs('vault.approve')).toEqual([['1000']])
  })
})
