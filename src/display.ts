import chalk from 'chalk'

const BRAND = chalk.hex('#7B3FE4')
const ACCENT = chalk.hex('#00D4AA')
const DIM = chalk.dim
const BOLD = chalk.bold

/**
 * ASCII banner printed by the CLI on startup.
 */
export const BANNER = `
${BRAND('╔══════════════════════════════════════════╗')}
${BRAND('║')}                                          ${BRAND('║')}
${BRAND('║')}     ${BOLD.hex('#7B3FE4')('███████╗███╗   ██╗███████╗')}     ${BRAND('║')}
${BRAND('║')}     ${BOLD.hex('#7B3FE4')('╚════██║████╗  ██║╚════██║')}     ${BRAND('║')}
${BRAND('║')}         ${BOLD.hex('#7B3FE4')('██║██╔██╗ ██║    ██║')}       ${BRAND('║')}
${BRAND('║')}        ${BOLD.hex('#7B3FE4')('██╔╝██║╚██╗██║   ██╔╝')}      ${BRAND('║')}
${BRAND('║')}        ${BOLD.hex('#7B3FE4')('██║ ██║ ╚████║   ██║')}       ${BRAND('║')}
${BRAND('║')}        ${BOLD.hex('#7B3FE4')('╚═╝ ╚═╝  ╚═══╝   ╚═╝')}       ${BRAND('║')}
${BRAND('║')}                                          ${BRAND('║')}
${BRAND('║')}   ${ACCENT('AI-Powered DeFi Trading Vault')}           ${BRAND('║')}
${BRAND('╚══════════════════════════════════════════╝')}
`

/**
 * Renders a bold section heading.
 */
export function heading(text: string): string {
  return `\n${BRAND('▸')} ${BOLD(text)}\n`
}

/**
 * Renders an aligned key/value line.
 */
export function label(key: string, value: string): string {
  return `  ${DIM(key.padEnd(20))} ${value}`
}

/**
 * Formats a USDC amount for display.
 */
export function usdcAmount(amount: string): string {
  return `${ACCENT(amount)} ${DIM('USDC')}`
}

/**
 * Formats a vault-share amount for display.
 */
export function sharesAmount(amount: string): string {
  return `${chalk.hex('#FFD700')(amount)} ${DIM('shares')}`
}

/**
 * Formats a 7N7D token amount for display.
 */
export function tokenAmount(amount: string): string {
  return `${BRAND(amount)} ${DIM('7N7D')}`
}

/**
 * Formats a transaction hash for display.
 */
export function txHash(hash: string): string {
  return DIM(hash)
}

/**
 * Formats a success line.
 */
export function success(text: string): string {
  return chalk.green(`✓ ${text}`)
}

/**
 * Formats an error line.
 */
export function error(text: string): string {
  return chalk.red(`✗ ${text}`)
}

/**
 * Formats a warning line.
 */
export function warn(text: string): string {
  return chalk.yellow(`⚠ ${text}`)
}

/**
 * Draws a boxed panel around the given lines.
 */
export function box(lines: string[]): string {
  const maxLen = Math.max(...lines.map(l => stripAnsi(l).length))
  const top = DIM('┌' + '─'.repeat(maxLen + 2) + '┐')
  const bottom = DIM('└' + '─'.repeat(maxLen + 2) + '┘')
  const body = lines.map(l => {
    const pad = maxLen - stripAnsi(l).length
    return DIM('│') + ' ' + l + ' '.repeat(pad) + ' ' + DIM('│')
  })
  return [top, ...body, bottom].join('\n')
}

/**
 * Strips ANSI escape sequences so line widths can be measured.
 */
function stripAnsi(str: string): string {
  return str.replace(/\x1B\[[0-9;]*m/g, '')
}

/**
 * Renders a horizontal separator line.
 */
export function separator(): string {
  return DIM('─'.repeat(44))
}

/**
 * Formats the badge that shows the active network.
 */
export function networkBadge(network: string): string {
  if (network === 'mainnet') {
    return chalk.bgGreen.black(' MAINNET ')
  }
  return chalk.bgYellow.black(' TESTNET ')
}
