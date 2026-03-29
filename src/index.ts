import { Command } from 'commander'
import { BANNER } from './display.js'
import { registerBalance } from './commands/balance.js'
import { registerStatus } from './commands/status.js'
import { registerDeposit } from './commands/deposit.js'
import { registerWithdraw } from './commands/withdraw.js'
import { registerApprove } from './commands/approve.js'

const program = new Command()

program
  .name('7n7d')
  .description('CLI for the 7N7D DeFi Trading Vault')
  .version('0.1.0')
  .option('--network <network>', 'Network to use (testnet|mainnet)', 'testnet')
  .option('--private-key <key>', 'Private key for write operations')
  .option('--rpc-url <url>', 'RPC URL')
  .hook('preAction', () => {
    console.log(BANNER)
  })

registerBalance(program)
registerStatus(program)
registerDeposit(program)
registerWithdraw(program)
registerApprove(program)

program.parse()
