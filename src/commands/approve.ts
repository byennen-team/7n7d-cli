import chalk from 'chalk'
import ora from 'ora'
import inquirer from 'inquirer'
import type { Command } from 'commander'
import { createSDK, requireWallet, type CLIOptions } from '../config.js'
import { heading, label, usdcAmount, txHash, success, separator, networkBadge } from '../display.js'

export function registerApprove(program: Command) {
  program
    .command('approve')
    .description('Approve USDC spending for the vault')
    .argument('<amount>', 'Amount of USDC to approve')
    .action(async (amount: string) => {
      const opts = program.opts<CLIOptions>()
      const sdk = createSDK(opts)
      requireWallet(sdk)

      const spinner = ora('Checking current allowance...').start()

      try {
        const currentAllowance = await sdk.vault.getAllowance(sdk.address)
        spinner.stop()

        console.log(heading(`Approve USDC ${networkBadge(sdk.network)}`))
        console.log(label('Current Allowance', usdcAmount(currentAllowance)))
        console.log(label('New Allowance', usdcAmount(amount)))
        console.log(separator())

        const { confirm } = await inquirer.prompt([{
          type: 'confirm',
          name: 'confirm',
          message: `Approve ${amount} USDC for the vault?`,
          default: false,
        }])

        if (!confirm) {
          console.log(chalk.dim('  Cancelled'))
          return
        }

        const approveSpinner = ora('Approving USDC...').start()
        const hash = await sdk.vault.approve(amount)
        approveSpinner.succeed('USDC approved')
        console.log(label('Tx Hash', txHash(hash)))
        console.log()
      } catch (err: any) {
        console.error(chalk.red(`\n✗ Approval failed: ${err.message}`))
        process.exit(1)
      }
    })
}
