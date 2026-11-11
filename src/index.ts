import { createProgram } from './cli.js'

// Every command action is async. parse() does not await them, so an error
// thrown outside a command's try block (for example the missing-RPC-URL
// check in createSDK) escapes as an unhandled rejection instead of a
// reported CLI error. parseAsync() waits for the action to settle.
await createProgram().parseAsync()
