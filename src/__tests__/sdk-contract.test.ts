import { describe, expect, it } from 'vitest'
import { SevenNSevenD, formatShares } from '@7n7d/sdk'

/**
 * Compatibility guard.
 *
 * The command tests mock the SDK, so they cannot catch an SDK method being
 * renamed or removed. This suite runs against the real, unmocked package and
 * asserts that every member the CLI calls still exists.
 */
describe('SDK contract', () => {
  const VAULT_METHODS = [
    'getAllowance',
    'getBalance',
    'getTVL',
    'getSharePrice',
    'estimateDeposit',
    'approve',
    'deposit',
    'depositWithApproval',
    'withdraw',
    'getWithdrawalInfo',
  ] as const

  it('exposes every vault method the CLI calls', () => {
    const sdk = new SevenNSevenD({ rpcUrl: 'http://127.0.0.1:8545', network: 'testnet' })

    for (const method of VAULT_METHODS) {
      expect(typeof sdk.vault[method], `vault.${method}`).toBe('function')
    }
    expect(typeof sdk.token.getBalance).toBe('function')
  })

  it('exposes the share formatter the CLI calls', () => {
    expect(typeof formatShares).toBe('function')
    expect(formatShares(5n * 10n ** 18n)).toBe('5')
  })

  it('reports the configured network', () => {
    const sdk = new SevenNSevenD({ rpcUrl: 'http://127.0.0.1:8545', network: 'mainnet' })
    expect(sdk.network).toBe('mainnet')
  })

  it('has no address without a private key and derives one with it', () => {
    const anonymous = new SevenNSevenD({ rpcUrl: 'http://127.0.0.1:8545' })
    expect(anonymous.address).toBeUndefined()

    const wallet = new SevenNSevenD({
      rpcUrl: 'http://127.0.0.1:8545',
      privateKey: `0x${'11'.repeat(32)}`,
    })
    expect(wallet.address).toMatch(/^0x[0-9a-fA-F]{40}$/)
  })
})
