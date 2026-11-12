import { SevenNSevenD, type Network } from '@7n7d/sdk'
import dotenv from 'dotenv'

dotenv.config()

export interface CLIOptions {
  network?: string
  rpcUrl?: string
}

/**
 * Builds an SDK client from CLI options and environment variables.
 */
export function createSDK(opts: CLIOptions): SevenNSevenD {
  // Network precedence: the --network flag wins, then the NETWORK environment
  // variable, then testnet. The CLI declares --network without a Commander
  // default on purpose: a default would always be truthy and would shadow the
  // environment variable. An empty NETWORK value counts as unset and falls
  // back to testnet. The value is cast rather than validated, so an unknown
  // network name is passed through to the SDK unchanged.
  const network = (opts.network || process.env.NETWORK || 'testnet') as Network
  const rpcUrl = opts.rpcUrl || process.env.RPC_URL
  // Read only from the environment: a CLI flag would leak the key into shell
  // history and the process list.
  const privateKey = process.env.PRIVATE_KEY

  if (!rpcUrl) {
    throw new Error('RPC URL required. Set --rpc-url flag or RPC_URL in .env')
  }

  return new SevenNSevenD({
    rpcUrl,
    network,
    ...(privateKey ? { privateKey: privateKey as `0x${string}` } : {}),
  })
}

/**
 * Asserts the SDK client has a wallet address, i.e. a private key was configured.
 */
export function requireWallet(sdk: SevenNSevenD): asserts sdk is SevenNSevenD & { address: `0x${string}` } {
  if (!sdk.address) {
    throw new Error('Private key required. Set PRIVATE_KEY in your environment or .env')
  }
}
