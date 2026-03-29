import chalk from 'chalk'

const BRAND = chalk.hex('#7B3FE4')
const ACCENT = chalk.hex('#00D4AA')
const DIM = chalk.dim
const BOLD = chalk.bold

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

export function heading(text: string): string {
  return `\n${BRAND('▸')} ${BOLD(text)}\n`
}

export function label(key: string, value: string): string {
  return `  ${DIM(key.padEnd(20))} ${value}`
}

export function usdcAmount(amount: string): string {
  return `${ACCENT(amount)} ${DIM('USDC')}`
}

export function sharesAmount(amount: string): string {
  return `${chalk.hex('#FFD700')(amount)} ${DIM('shares')}`
}

export function tokenAmount(amount: string): string {
  return `${BRAND(amount)} ${DIM('7N7D')}`
}

export function txHash(hash: string): string {
  return DIM(hash)
}

export function success(text: string): string {
  return chalk.green(`✓ ${text}`)
}

export function error(text: string): string {
  return chalk.red(`✗ ${text}`)
}

export function warn(text: string): string {
  return chalk.yellow(`⚠ ${text}`)
}

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

function stripAnsi(str: string): string {
  return str.replace(/\x1B\[[0-9;]*m/g, '')
}

export function separator(): string {
  return DIM('─'.repeat(44))
}

export function networkBadge(network: string): string {
  if (network === 'mainnet') {
    return chalk.bgGreen.black(' MAINNET ')
  }
  return chalk.bgYellow.black(' TESTNET ')
}
