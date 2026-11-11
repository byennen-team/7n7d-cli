/**
 * Test double for `@7n7d/sdk`.
 *
 * The CLI only ever talks to the SDK through `SevenNSevenD`, so the double
 * exposes the same surface (vault + token modules) and records every call
 * together with the arguments it received. Recording the arguments matters:
 * a call log without them cannot tell `deposit('100')` apart from
 * `deposit('1000000')`.
 */

type Handler = (...args: unknown[]) => unknown

export interface SdkDoubleConfig {
  rpcUrl: string
  network?: string
  privateKey?: string
}

export interface SdkCall {
  method: string
  args: unknown[]
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

/**
 * Returns a fake SDK client for tests.
 */
export const sdkDouble = {
  instances: [] as SdkDouble[],
  calls: [] as SdkCall[],
  overrides: {} as Record<string, Handler>,

  reset(): void {
    this.instances = []
    this.calls = []
    this.overrides = {}
  },

  /** Method names, in call order. */
  callLog(): string[] {
    return this.calls.map((call) => call.method)
  },

  /** Every recorded call to one method, with its arguments. */
  callsTo(method: string): SdkCall[] {
    return this.calls.filter((call) => call.method === method)
  },

  /** Argument tuples for every call to one method. */
  callArgs(method: string): unknown[][] {
    return this.callsTo(method).map((call) => call.args)
  },

  /** How many times one method was called. */
  callCount(method: string): number {
    return this.callsTo(method).length
  },

  /** True when any transaction method was invoked. */
  calledTransaction(): boolean {
    return this.calls.some((call) =>
      ['vault.approve', 'vault.deposit', 'vault.depositWithApproval', 'vault.withdraw'].includes(
        call.method,
      ),
    )
  },
}

/**
 * Builds a module double that exports the given SDK surface.
 */
function buildModule(prefix: 'vault' | 'token', methods: readonly string[]): Record<string, Handler> {
  const module: Record<string, Handler> = {}
  for (const method of methods) {
    const key = `${prefix}.${method}`
    module[method] = async (...args: unknown[]) => {
      sdkDouble.calls.push({ method: key, args })
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
    // Deliberately different from TEST_ADDRESS, so a test can tell an
    // explicitly supplied address apart from the wallet fallback.
    this.address = config.privateKey ? `0x${'2'.repeat(40)}` : undefined
    this.network = config.network ?? 'testnet'
    this.vault = buildModule('vault', VAULT_METHODS)
    this.token = buildModule('token', TOKEN_METHODS)
    sdkDouble.instances.push(this)
  }
}
