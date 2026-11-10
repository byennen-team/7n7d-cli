import { describe, expect, it } from 'vitest'
import {
  BANNER,
  box,
  error,
  heading,
  label,
  networkBadge,
  separator,
  sharesAmount,
  success,
  tokenAmount,
  txHash,
  usdcAmount,
  warn,
} from '../display.js'
import { stripAnsi } from './helpers/harness'

describe('display', () => {
  it('renders the banner with the product tagline', () => {
    const banner = stripAnsi(BANNER)
    expect(banner).toContain('AI-Powered DeFi Trading Vault')
  })

  it('renders a heading marker with the text', () => {
    const rendered = stripAnsi(heading('Vault Status'))
    expect(rendered).toContain('▸')
    expect(rendered).toContain('Vault Status')
  })

  it('pads the label column to a fixed width', () => {
    const rendered = stripAnsi(label('Address', '0xabc'))
    expect(rendered).toContain('Address')
    expect(rendered).toContain('0xabc')
    expect(rendered.slice(2, 22)).toBe('Address'.padEnd(20))
  })

  it('renders each amount with its unit', () => {
    expect(stripAnsi(usdcAmount('12.5'))).toBe('12.5 USDC')
    expect(stripAnsi(sharesAmount('3.25'))).toBe('3.25 shares')
    expect(stripAnsi(tokenAmount('99'))).toBe('99 7N7D')
  })

  it('renders a transaction hash', () => {
    expect(stripAnsi(txHash('0xdeadbeef'))).toContain('0xdeadbeef')
  })

  it('renders success, error and warning markers', () => {
    expect(stripAnsi(success('done'))).toBe('✓ done')
    expect(stripAnsi(error('failed'))).toBe('✗ failed')
    expect(stripAnsi(warn('careful'))).toBe('⚠ careful')
  })

  it('draws a box whose borders match the widest line', () => {
    const rendered = stripAnsi(box(['short', 'a much longer line']))
    const lines = rendered.split('\n')
    expect(lines).toHaveLength(4)
    expect(lines[0].startsWith('┌')).toBe(true)
    expect(lines[3].startsWith('└')).toBe(true)
    expect(lines[0]).toHaveLength(lines[3].length)
    for (const line of lines) {
      expect(line).toHaveLength(lines[0].length)
    }
  })

  it('draws a separator of the expected width', () => {
    expect(stripAnsi(separator())).toBe('─'.repeat(44))
  })

  it('badges mainnet and testnet differently', () => {
    expect(stripAnsi(networkBadge('mainnet'))).toContain('MAINNET')
    expect(stripAnsi(networkBadge('testnet'))).toContain('TESTNET')
    expect(stripAnsi(networkBadge('anything-else'))).toContain('TESTNET')
  })
})
