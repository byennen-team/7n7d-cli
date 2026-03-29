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
--private-key <key>                   # Or set PRIVATE_KEY in .env
--rpc-url <url>                       # Or set RPC_URL in .env
```

### Examples

```bash
# Testnet with env vars
7n7d balance

# Mainnet with flags
7n7d status --network mainnet --rpc-url https://arb1.arbitrum.io/rpc

# Deposit with private key flag
7n7d deposit 100 --private-key 0x...
```
