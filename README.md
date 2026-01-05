# TETSUO Mining Pool

Public mining pool for TETSUO cryptocurrency.

**Live:** https://tetsuo.ink

## Features

- PPLNS (Pay Per Last N Shares) reward system
- Automatic payouts every 3 minutes
- No registration required - just connect with your wallet address
- Real-time statistics and block tracking

## Tech Stack

- **Frontend:** Next.js 14 (App Router)
- **Database:** PostgreSQL + Prisma ORM
- **Cache:** Redis
- **Stratum:** ckpool (patched for TETSUO)
- **Process Manager:** PM2

## Mining

Connect your SHA-256 miner to:

```
stratum+tcp://tetsuo.ink:3333
```

**Username:** Your TETSUO wallet address (e.g., `TYourWalletAddress`)
**Password:** `x` (any value)

Worker names supported: `TYourWalletAddress.rig1`

## TETSUO Blockchain

| Parameter | Value |
|-----------|-------|
| Algorithm | SHA-256 |
| Block Time | 60 seconds |
| Block Reward | 10,000 TETSUO |

## Pool Configuration

| Setting | Value |
|---------|-------|
| Pool Fee | 10% |
| PPLNS Window | 120 minutes |
| Min Payout | 100 TETSUO |
| Block Maturity | 100 confirmations |

## Project Structure

```
tetsuo-pool/
├── apps/
│   ├── web/          # Next.js frontend + API
│   └── workers/      # Background services
│       ├── share-parser/
│       ├── block-watcher/
│       ├── pplns-calculator/
│       └── payout-worker/
├── packages/
│   ├── database/     # Prisma schema & client
│   ├── tetsuo-rpc/   # TETSUO RPC client
│   └── shared/       # Common utilities
```

## Development

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Run development server
npm run dev --workspace=apps/web

# Run workers
npm run dev --workspace=apps/workers
```

## License

Private repository.
