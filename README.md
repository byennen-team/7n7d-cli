# @7n7d/cli

Terminal CLI for the 7N7D DeFi Trading Vault.

## Install

```bash
npm install -g @7n7d/cli
```

Or run locally:

```bash
git clone <repo>
cd 7n7d-cli
npm install
npm run build
```

## Setup

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

```
RPC_URL=https://rpc.sepolia.org
PRIVATE_KEY=0x...
```

Read-only commands (`balance`, `status`) work without a private key. Write commands (`deposit`, `withdraw`, `approve`) require one.

## Usage

### Check balances

```bash
7n7d balance                          # Your wallet (requires private key)
7n7d balance 0xABC...                 # Any address
```

### Vault status

```bash
7n7d status                           # TVL, share price, your position
```

### Deposit USDC

```bash
7n7d deposit 100                      # Deposit 100 USDC (auto-approves if needed)
```

### Withdraw shares

```bash
7n7d withdraw 50                      # Request withdrawal of 50 shares
```

### Approve USDC

```bash
7n7d approve 1000                     # Approve 1000 USDC for the vault
```

### Options

```bash
--network testnet|mainnet             # Default: testnet
--rpc-url <url>                       # Or set RPC_URL in .env
```

### Examples

```bash
# Testnet with env vars
7n7d balance

# Mainnet with flags
7n7d status --network mainnet --rpc-url https://arb1.arbitrum.io/rpc

# Deposit (reads PRIVATE_KEY from the environment or .env; there is no flag,
# so the key is never passed as a command-line argument. Prefer .env over an
# inline PRIVATE_KEY=... prefix, which shells can save to history.)
7n7d deposit 100
```


## Development

The CLI depends on `@7n7d/sdk` through `file:../7n7d-sdk`, so the SDK has to be
checked out next to this repository and built before the CLI will install:

```bash
git clone https://github.com/byennen-team/7n7d-sdk ../7n7d-sdk
cd ../7n7d-sdk && npm install && npm run build && cd -
npm install
```

### Commands

| Command | What it does |
| --- | --- |
| `npm test` | Run the test suite once |
| `npm run test:coverage` | Run the suite with a coverage report (fails under the configured thresholds) |
| `npm run typecheck` | Type-check the CLI and its tests |
| `npm run build` | Build the bundle into `dist/` |

CI checks out the SDK at a pinned revision as a sibling directory, installs and
builds it, then runs typecheck, the coverage-gated test suite, the build, and a
smoke test of the built binary. The test step is deliberately **not**
`npm test --if-present`: a missing or failing test script must fail the build
rather than pass silently.
