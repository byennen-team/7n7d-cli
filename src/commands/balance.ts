import chalk from 'chalk'
import ora from 'ora'
import type { Command } from 'commander'
import { createSDK, type CLIOptions } from '../config.js'
import { heading, label, usdcAmount, sharesAmount, tokenAmount, box, separator, networkBadge } from '../display.js'

export function registerBalance(program: Command) {
  program
    .command('balance')
    .description('Show all balances (wallet USDC, vault shares, 7N7D tokens)')
    .argument('[address]', 'Wallet address to check (defaults to your wallet)')
    .action(async (address?: string) => {
      const opts = program.opts<CLIOptions>()
      const sdk = createSDK(opts)

      const target = address || sdk.address
      if (!target) {
        console.error(chalk.red('Provide an address argument or set a private key'))
        process.exit(1)
      }

      const spinner = ora('Fetching balances...').start()

      try {
        const [vaultBalance, tokenBalance] = await Promise.all([
          sdk.vault.getBalance(target as `0x${string}`),
          sdk.token.getBalance(target as `0x${string}`),
        ])

        spinner.stop()

        console.log(heading(`Balances ${networkBadge(sdk.network)}`))
        console.log(label('Address', chalk.dim(target)))
        console.log(separator())
        console.log()
        console.log(box([
          `${chalk.bold('Vault Position')}`,
          `Shares:         ${sharesAmount(vaultBalance.sharesFormatted)}`,
          `USDC Value:     ${usdcAmount(vaultBalance.assetsFormatted)}`,
          '',
          `${chalk.bold('Token Balance')}`,
          `7N7D:           ${tokenAmount(tokenBalance)}`,
        ]))
        console.log()
      } catch (err: any) {
        spinner.fail('Failed to fetch balances')
        console.error(chalk.red(err.message))
        process.exit(1)
      }
    })
}
