import { SevenNSevenD, type Network } from '@7n7d/sdk'
import dotenv from 'dotenv'

dotenv.config()

export interface CLIOptions {
  network?: string
  privateKey?: string
  rpcUrl?: string
}

export function createSDK(opts: CLIOptions): SevenNSevenD {
  const network = (opts.network || process.env.NETWORK || 'testnet') as Network
  const rpcUrl = opts.rpcUrl || process.env.RPC_URL
  const privateKey = opts.privateKey || process.env.PRIVATE_KEY

  if (!rpcUrl) {
    throw new Error('RPC URL required. Set --rpc-url flag or RPC_URL in .env')
  }

  return new SevenNSevenD({
    rpcUrl,
    network,
    ...(privateKey ? { privateKey: privateKey as `0x${string}` } : {}),
  })
}

export function requireWallet(sdk: SevenNSevenD): asserts sdk is SevenNSevenD & { address: `0x${string}` } {
  if (!sdk.address) {
    throw new Error('Private key required. Set --private-key flag or PRIVATE_KEY in .env')
  }
}
