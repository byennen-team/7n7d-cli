/**
 * Test double for `@7n7d/sdk`.
 *
 * The CLI only ever talks to the SDK through `SevenNSevenD`, so the double
 * exposes the same surface (vault + token modules) and records every call.
 * Tests configure behaviour by installing an override and assert on the
 * recorded call log.
 */

type Handler = (...args: unknown[]) => unknown

export interface SdkDoubleConfig {
  rpcUrl: string
  network?: string
  privateKey?: string
}

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

const TOKEN_METHODS = ['getBalance'] as const

const DEFAULTS: Record<string, unknown> = {
  'vault.getAllowance': '0',
  'vault.getBalance': {
    shares: 0n,
    sharesFormatted: '0',
    assets: 0n,
    assetsFormatted: '0',
  },
  'vault.getTVL': '0',
  'vault.getSharePrice': '1.00',
  'vault.estimateDeposit': '0',
  'vault.approve': '0xapprove',
  'vault.deposit': '0xdeposit',
  'vault.depositWithApproval': {
    approveHash: '0xapprove',
    depositHash: '0xdeposit',
  },
  'vault.withdraw': '0xwithdraw',
  'vault.getWithdrawalInfo': {
    shares: 0n,
    assets: 0n,
    unlockTime: 0n,
    isReady: false,
  },
  'token.getBalance': '0',
}

export const sdkDouble = {
  instances: [] as SdkDouble[],
  calls: [] as string[],
  overrides: {} as Record<string, Handler>,

  reset(): void {
    this.instances = []
    this.calls = []
    this.overrides = {}
  },

  /** Calls made against the SDK, in order. */
  callLog(): string[] {
    return [...this.calls]
  },

  /** True when any transaction method was invoked. */
  calledTransaction(): boolean {
    return this.calls.some((call) =>
      ['vault.approve', 'vault.deposit', 'vault.depositWithApproval', 'vault.withdraw'].includes(call),
    )
  },
}

function buildModule(prefix: 'vault' | 'token', methods: readonly string[]): Record<string, Handler> {
  const module: Record<string, Handler> = {}
  for (const method of methods) {
    const key = `${prefix}.${method}`
    module[method] = async (...args: unknown[]) => {
      sdkDouble.calls.push(key)
      const override = sdkDouble.overrides[key]
      if (override) {
        return override(...args)
      }
      return DEFAULTS[key]
    }
  }
  return module
}

export class SdkDouble {
  readonly config: SdkDoubleConfig
  readonly address: `0x${string}` | undefined
  readonly network: string
  readonly vault: Record<string, Handler>
  readonly token: Record<string, Handler>

  constructor(config: SdkDoubleConfig) {
    this.config = config
    this.address = config.privateKey ? `0x${'1'.repeat(40)}` : undefined
    this.network = config.network ?? 'testnet'
    this.vault = buildModule('vault', VAULT_METHODS)
    this.token = buildModule('token', TOKEN_METHODS)
    sdkDouble.instances.push(this)
  }
}
