import chalk from 'chalk'
import ora from 'ora'
import inquirer from 'inquirer'
import type { Command } from 'commander'
import { createSDK, requireWallet, type CLIOptions } from '../config.js'
import { heading, label, usdcAmount, sharesAmount, txHash, success, separator, networkBadge } from '../display.js'

export function registerDeposit(program: Command) {
  program
    .command('deposit')
    .description('Deposit USDC into the vault')
    .argument('<amount>', 'Amount of USDC to deposit')
    .action(async (amount: string) => {
      const opts = program.opts<CLIOptions>()
      const sdk = createSDK(opts)
      requireWallet(sdk)

      const spinner = ora('Fetching deposit preview...').start()

      try {
        const [estimatedShares, allowance, vaultBalance] = await Promise.all([
          sdk.vault.estimateDeposit(amount),
          sdk.vault.getAllowance(sdk.address),
          sdk.vault.getBalance(sdk.address),
        ])

        spinner.stop()

        console.log(heading(`Deposit ${networkBadge(sdk.network)}`))
        console.log(label('Amount', usdcAmount(amount)))
        console.log(label('Est. Shares', sharesAmount(estimatedShares)))
        console.log(label('Current Shares', sharesAmount(vaultBalance.sharesFormatted)))
        console.log(label('Current Allowance', usdcAmount(allowance)))
        console.log(separator())

        const needsApproval = parseFloat(allowance) < parseFloat(amount)
        if (needsApproval) {
          console.log(chalk.yellow('  USDC approval needed — will auto-approve\n'))
        }

        const { confirm } = await inquirer.prompt([{
          type: 'confirm',
          name: 'confirm',
          message: `Deposit ${amount} USDC into the vault?`,
          default: false,
        }])

        if (!confirm) {
          console.log(chalk.dim('  Cancelled'))
          return
        }

        if (needsApproval) {
          const approveSpinner = ora('Approving USDC...').start()
          const result = await sdk.vault.depositWithApproval(amount)
          approveSpinner.succeed('USDC approved')
          console.log(label('Approve Tx', txHash(result.approveHash)))

          console.log(success('Deposit successful'))
          console.log(label('Deposit Tx', txHash(result.depositHash)))
        } else {
          const depositSpinner = ora('Depositing USDC...').start()
          const hash = await sdk.vault.deposit(amount)
          depositSpinner.succeed('Deposit successful')
          console.log(label('Tx Hash', txHash(hash)))
        }

        console.log()
      } catch (err: any) {
        console.error(chalk.red(`\n✗ Deposit failed: ${err.message}`))
        process.exit(1)
      }
    })
}
