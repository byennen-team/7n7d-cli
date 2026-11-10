import { describe, expect, it, vi } from 'vitest'

const parse = vi.fn()

vi.mock('../cli.js', () => ({
  createProgram: () => ({ parse }),
}))

describe('entry point', () => {
  it('parses the process arguments', async () => {
    await import('../index.js')
    expect(parse).toHaveBeenCalledTimes(1)
  })
})
