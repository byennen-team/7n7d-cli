import chalk from 'chalk'
import ora from 'ora'
import inquirer from 'inquirer'
import type { Command } from 'commander'
import { createSDK, requireWallet, type CLIOptions } from '../config.js'
import { heading, label, usdcAmount, sharesAmount, txHash, success, separator, networkBadge } from '../display.js'

export function registerWithdraw(program: Command) {
  program
    .command('withdraw')
    .description('Request withdrawal from the vault')
    .argument('<shares>', 'Number of shares to withdraw')
    .action(async (shares: string) => {
      const opts = program.opts<CLIOptions>()
      const sdk = createSDK(opts)
      requireWallet(sdk)

      const spinner = ora('Fetching withdrawal preview...').start()

      try {
        const [vaultBalance, withdrawalInfo, sharePrice] = await Promise.all([
          sdk.vault.getBalance(sdk.address),
          sdk.vault.getWithdrawalInfo(sdk.address),
          sdk.vault.getSharePrice(),
        ])

        spinner.stop()

        const estimatedUsdc = (parseFloat(shares) * parseFloat(sharePrice)).toFixed(2)

        console.log(heading(`Withdraw ${networkBadge(sdk.network)}`))
        console.log(label('Shares to Withdraw', sharesAmount(shares)))
        console.log(label('Est. USDC Value', usdcAmount(estimatedUsdc)))
        console.log(label('Current Shares', sharesAmount(vaultBalance.sharesFormatted)))
        console.log(label('Share Price', usdcAmount(sharePrice)))
        console.log(separator())

        if (withdrawalInfo.shares > 0n) {
          console.log(chalk.yellow('  You have a pending withdrawal'))
          console.log(label('Pending Shares', sharesAmount(withdrawalInfo.shares.toString())))
          console.log(label('Ready', withdrawalInfo.isReady ? chalk.green('Yes') : chalk.yellow('No')))
          console.log()
        }

        const { confirm } = await inquirer.prompt([{
          type: 'confirm',
          name: 'confirm',
          message: `Request withdrawal of ${shares} shares (~${estimatedUsdc} USDC)?`,
          default: false,
        }])

        if (!confirm) {
          console.log(chalk.dim('  Cancelled'))
          return
        }

        const withdrawSpinner = ora('Requesting withdrawal...').start()
        const hash = await sdk.vault.withdraw(shares)
        withdrawSpinner.succeed('Withdrawal requested')
        console.log(label('Tx Hash', txHash(hash)))
        console.log()
        console.log(chalk.dim('  Note: Withdrawals are subject to a lock period'))
        console.log()
      } catch (err: any) {
        console.error(chalk.red(`\n✗ Withdrawal failed: ${err.message}`))
        process.exit(1)
      }
    })
}
