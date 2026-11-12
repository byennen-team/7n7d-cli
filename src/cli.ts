import { Command } from 'commander'
import { BANNER } from './display.js'
import { registerBalance } from './commands/balance.js'
import { registerStatus } from './commands/status.js'
import { registerDeposit } from './commands/deposit.js'
import { registerWithdraw } from './commands/withdraw.js'
import { registerApprove } from './commands/approve.js'

/**
 * Build the CLI program: global options, banner hook and command wiring.
 *
 * Kept separate from `src/index.ts` so tests can drive a real Commander
 * instance without executing the entry point. The options and hook are
 * identical to the ones `src/index.ts` used to declare inline.
 */
export function createProgram(): Command {
  const program = new Command()

  program
    .name('7n7d')
    .description('CLI for the 7N7D DeFi Trading Vault')
    .version('0.1.0')
    .option('--network <network>', 'Network (testnet|mainnet). Env: NETWORK. Default: testnet')
    .option('--rpc-url <url>', 'RPC URL')
    .hook('preAction', () => {
      console.log(BANNER)
    })

  registerBalance(program)
  registerStatus(program)
  registerDeposit(program)
  registerWithdraw(program)
  registerApprove(program)

  return program
}
