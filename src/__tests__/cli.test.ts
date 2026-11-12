import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@7n7d/sdk', async () => {
  const { SdkDouble } = await import('./helpers/sdk-double')
  return { SevenNSevenD: SdkDouble }
})

vi.mock('ora', async () => {
  const { oraDouble } = await import('./helpers/doubles')
  return { default: oraDouble }
})

vi.mock('dotenv', async () => {
  const { dotenvDouble } = await import('./helpers/doubles')
  return { default: dotenvDouble }
})

import { createProgram } from '../cli.js'
import { sdkDouble } from './helpers/sdk-double'
import { captureConsole, TEST_RPC_URL } from './helpers/harness'

describe('createProgram', () => {
  let capture: ReturnType<typeof captureConsole>

  beforeEach(() => {
    sdkDouble.reset()
    capture = captureConsole()
  })

  afterEach(() => {
    capture.restore()
    vi.unstubAllEnvs()
  })

  it('describes the CLI', () => {
    const program = createProgram()
    expect(program.name()).toBe('7n7d')
    expect(program.version()).toBe('0.1.0')
    expect(program.description()).toBe('CLI for the 7N7D DeFi Trading Vault')
  })

  it('registers every shipped command', () => {
    const names = createProgram().commands.map((command) => command.name())
    expect(names).toEqual(['balance', 'status', 'deposit', 'withdraw', 'approve'])
  })

  it('declares the expected command arguments', () => {
    const program = createProgram()
    const byName = new Map(program.commands.map((command) => [command.name(), command]))

    expect(byName.get('balance')?.registeredArguments[0].name()).toBe('address')
    expect(byName.get('balance')?.registeredArguments[0].required).toBe(false)
    expect(byName.get('deposit')?.registeredArguments[0].name()).toBe('amount')
    expect(byName.get('deposit')?.registeredArguments[0].required).toBe(true)
    expect(byName.get('withdraw')?.registeredArguments[0].name()).toBe('shares')
    expect(byName.get('withdraw')?.registeredArguments[0].required).toBe(true)
    expect(byName.get('approve')?.registeredArguments[0].name()).toBe('amount')
    expect(byName.get('approve')?.registeredArguments[0].required).toBe(true)
  })

  it('declares the global options and documents the network fallback', () => {
    const options = createProgram().options
    const longs = options.map((option) => option.long)
    expect(longs).toContain('--network')
    expect(longs).toContain('--rpc-url')
    const network = options.find((option) => option.long === '--network')
    // No Commander default: a default would shadow the NETWORK env var.
    expect(network?.defaultValue).toBeUndefined()
    expect(network?.description).toContain('NETWORK')
    expect(network?.description).toContain('testnet')
  })

  it('does not accept a private key on the command line', () => {
    const longs = createProgram().options.map((option) => option.long)
    expect(longs).not.toContain('--private-key')
  })

  it('passes the --network flag through to the SDK', async () => {
    const program = createProgram()
    await program.parseAsync(
      ['--network', 'mainnet', '--rpc-url', TEST_RPC_URL, 'status'],
      { from: 'user' },
    )

    expect(sdkDouble.instances[0].network).toBe('mainnet')
  })

  it('honours the NETWORK environment variable when --network is not passed', async () => {
    vi.stubEnv('NETWORK', 'mainnet')

    const program = createProgram()
    await program.parseAsync(['--rpc-url', TEST_RPC_URL, 'status'], { from: 'user' })

    expect(sdkDouble.instances).toHaveLength(1)
    expect(sdkDouble.instances[0].network).toBe('mainnet')
  })

  it('prefers the --network flag over the NETWORK environment variable', async () => {
    vi.stubEnv('NETWORK', 'mainnet')

    const program = createProgram()
    await program.parseAsync(
      ['--network', 'testnet', '--rpc-url', TEST_RPC_URL, 'status'],
      { from: 'user' },
    )

    expect(sdkDouble.instances).toHaveLength(1)
    expect(sdkDouble.instances[0].network).toBe('testnet')
  })

  it('defaults to testnet when neither the flag nor NETWORK is set', async () => {
    // An empty value counts as unset, exactly like an absent variable.
    vi.stubEnv('NETWORK', '')

    const program = createProgram()
    await program.parseAsync(['--rpc-url', TEST_RPC_URL, 'status'], { from: 'user' })

    expect(sdkDouble.instances).toHaveLength(1)
    expect(sdkDouble.instances[0].network).toBe('testnet')
  })

  it('prints the banner before a command runs', async () => {
    vi.stubEnv('NETWORK', '')

    const program = createProgram()
    await program.parseAsync(['--rpc-url', TEST_RPC_URL, 'status'], { from: 'user' })

    expect(capture.logs.join('\n')).toContain('AI-Powered DeFi Trading Vault')
    expect(sdkDouble.instances[0].network).toBe('testnet')
  })
})
