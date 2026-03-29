import chalk from 'chalk'
import ora from 'ora'
import type { Command } from 'commander'
import { createSDK, type CLIOptions } from '../config.js'
import { heading, label, usdcAmount, sharesAmount, box, separator, networkBadge } from '../display.js'

export function registerStatus(program: Command) {
  program
    .command('status')
    .description('Show vault status (TVL, share price, your position)')
    .action(async () => {
      const opts = program.opts<CLIOptions>()
      const sdk = createSDK(opts)

      const spinner = ora('Fetching vault status...').start()

      try {
        const [tvl, sharePrice] = await Promise.all([
          sdk.vault.getTVL(),
          sdk.vault.getSharePrice(),
        ])

        let positionLines: string[] = []
        if (sdk.address) {
          const balance = await sdk.vault.getBalance(sdk.address)
          positionLines = [
            '',
            `${chalk.bold('Your Position')}`,
            `Shares:         ${sharesAmount(balance.sharesFormatted)}`,
            `USDC Value:     ${usdcAmount(balance.assetsFormatted)}`,
          ]
        }

        spinner.stop()

        console.log(heading(`Vault Status ${networkBadge(sdk.network)}`))
        console.log()
        console.log(box([
          `${chalk.bold('Vault Overview')}`,
          `TVL:            ${usdcAmount(tvl)}`,
          `Share Price:    ${usdcAmount(sharePrice)}`,
          ...positionLines,
        ]))

        if (!sdk.address) {
          console.log()
          console.log(chalk.dim('  Set a private key to see your position'))
        }
        console.log()
      } catch (err: any) {
        spinner.fail('Failed to fetch vault status')
        console.error(chalk.red(err.message))
        process.exit(1)
      }
    })
}
