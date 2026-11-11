import { vi } from 'vitest'

/** Spinner double shaped like the object `ora(...).start()` returns. */
function createSpinner() {
  const spinner = {
    start: vi.fn(() => spinner),
    stop: vi.fn(),
    succeed: vi.fn(),
    fail: vi.fn(),
  }
  return spinner
}

/**
 * Returns a fake ora spinner that records its calls.
 */
export const spinnerDouble = createSpinner()

/** Default export replacement for `ora`. */
export const oraDouble = vi.fn(() => ({ start: vi.fn(() => spinnerDouble) }))

/** Replacement for `inquirer.prompt`. */
export const promptDouble = vi.fn()

/** Replacement for `dotenv.config`, so a developer's .env cannot leak in. */
export const dotenvDouble = { config: vi.fn() }
