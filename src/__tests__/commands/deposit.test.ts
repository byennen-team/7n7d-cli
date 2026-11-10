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
} from '../helpers/harness'

const BASE = ['--rpc-url', TEST_RPC_URL, 'deposit', '100']

describe('deposit command', () => {
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

  it('deposits the requested amount when the allowance already covers it', async () => {
    sdkDouble.overrides['vault.getAllowance'] = async () => '1000'
    promptDouble.mockResolvedValue({ confirm: true })

    const program = createProgram()
    await program.parseAsync(BASE, { from: 'user' })

    expect(sdkDouble.callArgs('vault.deposit')).toEqual([['100']])
    expect(sdkDouble.callCount('vault.deposit')).toBe(1)
    expect(sdkDouble.callCount('vault.depositWithApproval')).toBe(0)
    expect(spinnerDouble.succeed).toHaveBeenCalledWith('Deposit successful')
    expect(exits.codes).toEqual([])
  })

  it('approves the requested amount first when the allowance is below it', async () => {
    sdkDouble.overrides['vault.getAllowance'] = async () => '10'
    promptDouble.mockResolvedValue({ confirm: true })

    const program = createProgram()
    await program.parseAsync(BASE, { from: 'user' })

    expect(sdkDouble.callArgs('vault.depositWithApproval')).toEqual([['100']])
    expect(sdkDouble.callCount('vault.depositWithApproval')).toBe(1)
    expect(sdkDouble.callCount('vault.deposit')).toBe(0)

    const output = capture.logs.join('\n')
    expect(output).toContain('USDC approval needed')
    expect(spinnerDouble.succeed).toHaveBeenCalledWith('USDC approved')
    expect(output).toContain('0xapprove')
    expect(output).toContain('0xdeposit')
  })

  it('reads the allowance for the wallet address', async () => {
    sdkDouble.overrides['vault.getAllowance'] = async () => '1000'
    promptDouble.mockResolvedValue({ confirm: true })

    const program = createProgram()
    await program.parseAsync(BASE, { from: 'user' })

    expect(sdkDouble.callArgs('vault.getAllowance')).toEqual([[TEST_WALLET_ADDRESS]])
  })

  it('treats an allowance equal to the amount as sufficient', async () => {
    sdkDouble.overrides['vault.getAllowance'] = async () => '100'
    promptDouble.mockResolvedValue({ confirm: true })

    const program = createProgram()
    await program.parseAsync(BASE, { from: 'user' })

    expect(sdkDouble.callArgs('vault.deposit')).toEqual([['100']])
    expect(sdkDouble.callCount('vault.depositWithApproval')).toBe(0)
  })

  it('cancels without any transaction when the allowance is sufficient', async () => {
    sdkDouble.overrides['vault.getAllowance'] = async () => '1000'
    promptDouble.mockResolvedValue({ confirm: false })

    const program = createProgram()
    await program.parseAsync(BASE, { from: 'user' })

    expect(sdkDouble.callCount('vault.deposit')).toBe(0)
    expect(sdkDouble.callCount('vault.depositWithApproval')).toBe(0)
    expect(sdkDouble.calledTransaction()).toBe(false)
    expect(capture.logs.join('\n')).toContain('Cancelled')
  })

  it('cancels without any transaction when an approval would be needed', async () => {
    sdkDouble.overrides['vault.getAllowance'] = async () => '10'
    promptDouble.mockResolvedValue({ confirm: false })

    const program = createProgram()
    await program.parseAsync(BASE, { from: 'user' })

    expect(sdkDouble.callCount('vault.deposit')).toBe(0)
    expect(sdkDouble.callCount('vault.depositWithApproval')).toBe(0)
    expect(sdkDouble.calledTransaction()).toBe(false)
    expect(capture.logs.join('\n')).toContain('Cancelled')
  })

  it('rejects on the preflight failure when no wallet is available', async () => {
    vi.stubEnv('PRIVATE_KEY', '')

    const program = createProgram()

    await expect(
      program.parseAsync(['--rpc-url', TEST_RPC_URL, 'deposit', '100'], { from: 'user' }),
    ).rejects.toThrow(/Private key required/)

    expect(exits.codes).toEqual([])
    expect(capture.errors).toEqual([])
    expect(sdkDouble.calledTransaction()).toBe(false)
  })

  it('reports a failed preview read and exits', async () => {
    sdkDouble.overrides['vault.estimateDeposit'] = async () => {
      throw new Error('preview failed')
    }
    promptDouble.mockResolvedValue({ confirm: true })

    const program = createProgram()

    await expect(program.parseAsync(BASE, { from: 'user' })).rejects.toBeInstanceOf(ExitSentinel)

    expect(exits.codes).toEqual([1])
    expect(capture.errors.join('\n')).toContain('preview failed')
    expect(sdkDouble.calledTransaction()).toBe(false)
  })

  it('reports a failed prompt and exits', async () => {
    promptDouble.mockRejectedValue(new Error('prompt failed'))

    const program = createProgram()

    await expect(program.parseAsync(BASE, { from: 'user' })).rejects.toBeInstanceOf(ExitSentinel)

    expect(exits.codes).toEqual([1])
    expect(capture.errors.join('\n')).toContain('prompt failed')
    expect(sdkDouble.calledTransaction()).toBe(false)
  })

  it('reports a failed deposit and exits', async () => {
    sdkDouble.overrides['vault.getAllowance'] = async () => '1000'
    sdkDouble.overrides['vault.deposit'] = async () => {
      throw new Error('deposit failed')
    }
    promptDouble.mockResolvedValue({ confirm: true })

    const program = createProgram()

    await expect(program.parseAsync(BASE, { from: 'user' })).rejects.toBeInstanceOf(ExitSentinel)

    expect(exits.codes).toEqual([1])
    expect(capture.errors.join('\n')).toContain('deposit failed')
    expect(sdkDouble.callArgs('vault.deposit')).toEqual([['100']])
  })
})
