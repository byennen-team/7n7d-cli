import { beforeEach, describe, expect, it, vi } from 'vitest'
import { waitFor } from './helpers/harness'

const parseAsync = vi.fn()

vi.mock('../cli.js', () => ({
  createProgram: () => ({ parseAsync }),
}))

describe('entry point', () => {
  beforeEach(() => {
    vi.resetModules()
    parseAsync.mockReset()
    parseAsync.mockResolvedValue(undefined)
  })

  it('parses the process arguments and awaits the action', async () => {
    await import('../index.js')
    expect(parseAsync).toHaveBeenCalledTimes(1)
  })

  it('does not finish until the action settles', async () => {
    let settle: () => void = () => {}
    parseAsync.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          settle = resolve
        }),
    )

    let finished = false
    const pending = import('../index.js').then(() => {
      finished = true
    })

    // parseAsync has been called, so the entry point is waiting on it.
    await waitFor(() => parseAsync.mock.calls.length > 0)
    expect(finished).toBe(false)

    settle()
    await pending
    expect(finished).toBe(true)
  })
})
