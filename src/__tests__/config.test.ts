import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@7n7d/sdk', async () => {
  const { SdkDouble } = await import('./helpers/sdk-double')
  return { SevenNSevenD: SdkDouble }
})

vi.mock('dotenv', async () => {
  const { dotenvDouble } = await import('./helpers/doubles')
  return { default: dotenvDouble }
})

import { createSDK, requireWallet } from '../config.js'
import { sdkDouble } from './helpers/sdk-double'
import { TEST_ADDRESS, TEST_PRIVATE_KEY } from './helpers/harness'

describe('config', () => {
  beforeEach(() => {
    sdkDouble.reset()
    vi.unstubAllEnvs()
    vi.stubEnv('RPC_URL', '')
    vi.stubEnv('NETWORK', '')
    vi.stubEnv('PRIVATE_KEY', '')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('createSDK', () => {
    it('rejects when no RPC URL is available', () => {
      expect(() => createSDK({})).toThrow(/RPC URL required/)
      expect(sdkDouble.instances).toHaveLength(0)
    })

    it('prefers the --rpc-url flag over RPC_URL', () => {
      vi.stubEnv('RPC_URL', 'http://from-env')
      createSDK({ rpcUrl: 'http://from-flag' })
      expect(sdkDouble.instances[0].config.rpcUrl).toBe('http://from-flag')
    })

    it('falls back to RPC_URL when no flag is given', () => {
      vi.stubEnv('RPC_URL', 'http://from-env')
      createSDK({})
      expect(sdkDouble.instances[0].config.rpcUrl).toBe('http://from-env')
    })

    it('defaults the network to testnet', () => {
      createSDK({ rpcUrl: 'http://rpc' })
      expect(sdkDouble.instances[0].config.network).toBe('testnet')
    })

    it('honours the NETWORK environment variable', () => {
      vi.stubEnv('NETWORK', 'mainnet')
      createSDK({ rpcUrl: 'http://rpc' })
      expect(sdkDouble.instances[0].config.network).toBe('mainnet')
    })

    it('prefers the --network flag over NETWORK', () => {
      vi.stubEnv('NETWORK', 'mainnet')
      createSDK({ rpcUrl: 'http://rpc', network: 'testnet' })
      expect(sdkDouble.instances[0].config.network).toBe('testnet')
    })

    it('reads the private key from PRIVATE_KEY only', () => {
      vi.stubEnv('PRIVATE_KEY', TEST_PRIVATE_KEY)
      createSDK({ rpcUrl: 'http://rpc' })
      expect(sdkDouble.instances[0].config.privateKey).toBe(TEST_PRIVATE_KEY)
    })

    it('omits the private key when PRIVATE_KEY is not set', () => {
      createSDK({ rpcUrl: 'http://rpc' })
      expect(sdkDouble.instances[0].config.privateKey).toBeUndefined()
    })
  })

  describe('requireWallet', () => {
    it('rejects when the SDK has no address', () => {
      expect(() => requireWallet({ address: undefined } as never)).toThrow(/Private key required/)
    })

    it('accepts an SDK instance that carries an address', () => {
      expect(() => requireWallet({ address: TEST_ADDRESS } as never)).not.toThrow()
    })
  })
})
