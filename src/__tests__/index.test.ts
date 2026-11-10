import { describe, expect, it, vi } from 'vitest'

const parseAsync = vi.fn().mockResolvedValue(undefined)

vi.mock('../cli.js', () => ({
  createProgram: () => ({ parseAsync }),
}))

describe('entry point', () => {
  it('parses the process arguments and awaits the action', async () => {
    await import('../index.js')
    expect(parseAsync).toHaveBeenCalledTimes(1)
  })
})
