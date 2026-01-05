# TETSUO Mining Pool

Public PPLNS mining pool for TETSUO cryptocurrency.

**Live:** https://tetsuo.ink

## Features

- **PPLNS** (Pay Per Last N Shares) reward system
- Automatic payouts every 3 minutes
- No registration required - mine with your wallet address
- Real-time statistics and hashrate charts
- Worker management and monitoring

## Tech Stack

- **Frontend:** Next.js 14 (App Router)
- **Database:** PostgreSQL + Prisma ORM
- **Cache:** Redis
- **Stratum Server:** ckpool (patched for TETSUO)
- **Process Manager:** PM2

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

---

## Installation Guide

### Prerequisites

- **OS:** Ubuntu 22.04+ / Debian 12+
- **Node.js:** 20.x or higher
- **PostgreSQL:** 14+
- **Redis:** 6+
- **TETSUO Daemon:** Full node with RPC enabled

### 1. Clone Repository

```bash
git clone https://github.com/pixelGQ/tetsuo-pool.git
cd tetsuo-pool
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup PostgreSQL

```bash
# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql
```

```sql
CREATE USER pooluser WITH PASSWORD 'your_secure_password';
CREATE DATABASE tetsuo_pool OWNER pooluser;
GRANT ALL PRIVILEGES ON DATABASE tetsuo_pool TO pooluser;
\q
```

### 4. Setup Redis

```bash
# Install Redis
sudo apt install redis-server

# Enable persistence (recommended)
sudo nano /etc/redis/redis.conf
# Set: appendonly yes

# Set password (optional but recommended)
# Set: requirepass your_redis_password

sudo systemctl restart redis-server
```

### 5. Setup TETSUO Daemon

Install and configure the TETSUO full node:

```bash
# Create config directory
mkdir -p ~/.tetsuo

# Create configuration file
nano ~/.tetsuo/tetsuo.conf
```

```ini
# ~/.tetsuo/tetsuo.conf
server=1
daemon=1
txindex=1

# RPC Settings
rpcuser=your_rpc_user
rpcpassword=your_rpc_password
rpcport=8337
rpcallowip=127.0.0.1

# Network
port=8338
listen=1

# Wallet for pool payouts
wallet=pool
```

Create the pool wallet:

```bash
tetsuo-cli createwallet "pool"
tetsuo-cli -rpcwallet=pool getnewaddress
# Save this address as POOL_WALLET_ADDRESS
```

### 6. Setup ckpool (Stratum Server)

ckpool requires patches to work with TETSUO:

```bash
# Install dependencies
sudo apt install build-essential autoconf automake libtool libzmq3-dev

# Clone and build ckpool
git clone https://bitbucket.org/ckolivas/ckpool.git /opt/ckpool
cd /opt/ckpool
./autogen.sh
./configure
make
```

**Required Patches:**

Edit `/opt/ckpool/src/bitcoin.c`:

1. **coinbaseaux.flags** - Make it optional (TETSUO returns empty `coinbaseaux: {}`):
   - Find the code that requires `coinbaseaux.flags` and make it optional

2. **Address validation** - Add 'T' prefix support:
   - Find address validation and add 'T' to allowed prefixes

Create ckpool config:

```bash
sudo mkdir -p /etc/ckpool
sudo nano /etc/ckpool/ckpool.conf
```

```json
{
    "btcd": [{
        "url": "127.0.0.1:8337",
        "auth": "rpc_user",
        "pass": "rpc_password",
        "notify": true
    }],
    "btcaddress": "YOUR_POOL_WALLET_ADDRESS",
    "serverurl": ["0.0.0.0:3333"],
    "mindiff": 1,
    "startdiff": 64,
    "maxdiff": 0,
    "logdir": "/var/log/ckpool"
}
```

Create systemd service:

```bash
sudo nano /etc/systemd/system/ckpool.service
```

```ini
[Unit]
Description=ckpool Stratum Server
After=network.target

[Service]
Type=simple
ExecStart=/opt/ckpool/src/ckpool -c /etc/ckpool/ckpool.conf
Restart=always
User=root

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable ckpool
sudo systemctl start ckpool
```

### 7. Configure Environment

```bash
cp .env.example .env
nano .env
```

```env
# Database
DATABASE_URL=postgresql://pooluser:your_password@localhost:5432/tetsuo_pool

# Redis
REDIS_URL=redis://:redis_password@localhost:6379

# TETSUO RPC
TETSUO_RPC_HOST=127.0.0.1
TETSUO_RPC_PORT=8337
TETSUO_RPC_USER=your_rpc_user
TETSUO_RPC_PASS=your_rpc_password
TETSUO_RPC_WALLET=pool

# Pool Configuration
POOL_FEE_PERCENT=10
PPLNS_WINDOW_MINUTES=120
MIN_PAYOUT_THRESHOLD=100
BLOCK_MATURITY_CONFIRMATIONS=100
POOL_WALLET_ADDRESS=TYourPoolWalletAddress

# ckpool
CKPOOL_LOG_PATH=/var/log/ckpool/ckpool.log
```

### 8. Initialize Database

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push
```

### 9. Build and Run

**Development:**

```bash
# Terminal 1: Web server
npm run dev

# Terminal 2: Workers
npm run workers:dev
```

**Production (PM2):**

```bash
npm install -g pm2

# Build web app
npm run build --workspace=apps/web

# Create PM2 ecosystem config (see example below)
# Then start services:
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

Example `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'tetsuo-pool-web',
      cwd: './apps/web',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        // Add all env vars here
      }
    },
    {
      name: 'tetsuo-pool-workers',
      cwd: './apps/workers',
      script: 'npx',
      args: 'tsx src/index.ts --all',
      env: {
        NODE_ENV: 'production',
        // Add all env vars here
      }
    }
  ]
};
```

### 10. Nginx Reverse Proxy (Optional)

```bash
sudo apt install nginx certbot python3-certbot-nginx

sudo nano /etc/nginx/sites-available/tetsuo-pool
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/tetsuo-pool /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# SSL with Let's Encrypt
sudo certbot --nginx -d your-domain.com
```

---

## Project Structure

```
tetsuo-pool/
├── apps/
│   ├── web/                    # Next.js frontend + API
│   │   ├── src/app/
│   │   │   ├── api/            # API routes
│   │   │   ├── components/     # React components
│   │   │   ├── miner/          # Miner dashboard
│   │   │   └── page.tsx        # Homepage
│   │   └── package.json
│   └── workers/                # Background services
│       └── src/
│           ├── share-parser/   # Parse ckpool logs → shares
│           ├── block-watcher/  # Monitor new blocks
│           ├── pplns-calculator/ # Calculate rewards
│           └── payout-worker/  # Process payouts
├── packages/
│   ├── database/               # Prisma schema & client
│   ├── tetsuo-rpc/             # TETSUO RPC client library
│   └── shared/                 # Common utilities & config
├── .env.example
└── package.json
```

## Workers

| Worker | Description |
|--------|-------------|
| **ShareParser** | Parses ckpool logs and records shares to database |
| **BlockWatcher** | Monitors blockchain for new blocks and confirmations |
| **PPLNSCalculator** | Calculates miner rewards using PPLNS algorithm |
| **PayoutWorker** | Processes and sends payouts to miners |

---

## Mining

Connect your SHA-256 miner to:

```
stratum+tcp://tetsuo.ink:3333
```

**Username:** Your TETSUO wallet address (e.g., `TYourWalletAddress`)
**Password:** `x` (any value)

Worker names supported: `TYourWalletAddress.rig1`

---

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/pool/stats` | Pool statistics |
| `GET /api/pool/hashrate-history` | 24h hashrate data |
| `GET /api/miner/[address]` | Miner statistics |
| `GET /api/blocks` | Recent blocks |
| `GET /api/payouts` | Recent payouts |

---

## License

MIT License

## Contributing

Pull requests are welcome. For major changes, please open an issue first.
