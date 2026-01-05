# TETSUO Mining Pool

Public PPLNS mining pool for TETSUO cryptocurrency.

**Live:** https://tetsuo.ink

## Features

- **PPLNS** (Pay Per Last N Shares) reward system
- Automatic payouts every 3 minutes
- No registration required - mine with your wallet address
- Real-time statistics and hashrate charts
- Worker management and monitoring

---

## TETSUO Ecosystem

| Component | Description | Repository |
|-----------|-------------|------------|
| **TETSUO Core** | Blockchain daemon (tetsuod, tetsuo-cli) | [fullchain](https://github.com/Pavelevich/fullchain) |
| **TETSUO Node** | Easy node installation scripts | [tetsuonode](https://github.com/Pavelevich/tetsuonode) |
| **TETSUO Wallet** | CLI wallet for miners | [tetsuonpmwallet](https://github.com/Pavelevich/tetsuonpmwallet) |
| **TETSUO Pool** | Mining pool software (this repo) | [tetsuo-pool](https://github.com/pixelGQ/tetsuo-pool) |

## TETSUO Blockchain

| Parameter | Value |
|-----------|-------|
| Algorithm | SHA-256 |
| Block Time | 60 seconds |
| Block Reward | 10,000 TETSUO |
| Max Supply | 21 billion |
| Difficulty Retarget | Every 2016 blocks |

---

## For Miners

### Get a Wallet

Install TETSUO Wallet CLI:

```bash
npm install -g tetsuo-blockchain-wallet
tetsuo
```

Or build from source: [tetsuonpmwallet](https://github.com/Pavelevich/tetsuonpmwallet)

### Connect to Pool

Configure your SHA-256 miner:

```
Pool URL:  stratum+tcp://tetsuo.ink:3333
Username:  YOUR_TETSUO_ADDRESS
Password:  x
```

**Example:** `TYourWalletAddress.rig1` (worker name is optional)

### Pool Configuration

| Setting | Value |
|---------|-------|
| Pool Fee | 10% |
| PPLNS Window | 120 minutes |
| Min Payout | 100 TETSUO |
| Block Maturity | 100 confirmations |

---

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/pool/stats` | Pool statistics |
| `GET /api/pool/hashrate-history` | 24h hashrate chart data |
| `GET /api/miner/{address}` | Miner statistics |
| `GET /api/network` | Network info (difficulty, hashrate) |

---

# Installation Guide (Pool Operators)

This guide explains how to set up your own TETSUO mining pool.

## Architecture

```
┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│   Miners     │────▶│   ckpool    │────▶│   tetsuod    │
│ (SHA-256)    │:3333│  (Stratum)  │ RPC │ (Blockchain) │
└──────────────┘     └─────────────┘     └──────────────┘
                            │
                            ▼ logs
                     ┌─────────────┐
                     │  Workers    │
                     │ (Node.js)   │
                     └─────────────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
       ┌───────────┐ ┌───────────┐ ┌───────────┐
       │ PostgreSQL│ │   Redis   │ │  Next.js  │
       │   (DB)    │ │  (Cache)  │ │   (Web)   │
       └───────────┘ └───────────┘ └───────────┘
```

## Prerequisites

- **OS:** Ubuntu 22.04+ / Debian 12+
- **RAM:** 4GB minimum, 8GB recommended
- **Storage:** 20GB+ SSD
- **Node.js:** 20.x or higher
- **PostgreSQL:** 14+
- **Redis:** 6+

## Step 1: Install System Dependencies

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y build-essential cmake git curl wget \
    autoconf automake libtool libzmq3-dev pkg-config \
    postgresql postgresql-contrib redis-server nginx certbot python3-certbot-nginx
```

## Step 2: Install Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

## Step 3: Build TETSUO Core

Clone and build the TETSUO blockchain daemon:

```bash
git clone https://github.com/Pavelevich/fullchain.git /opt/fullchain
cd /opt/fullchain/tetsuo-core
mkdir build && cd build
cmake ..
cmake --build . --config Release -j$(nproc)
```

This creates:
- `tetsuod` - blockchain daemon
- `tetsuo-cli` - command-line interface
- `tetsuo-wallet` - wallet management

### Configure TETSUO Daemon

```bash
mkdir -p ~/.tetsuo
nano ~/.tetsuo/tetsuo.conf
```

```ini
# Server
server=1
daemon=1
txindex=1

# RPC
rpcuser=your_rpc_user
rpcpassword=your_secure_rpc_password
rpcallowip=127.0.0.1
rpcport=8337

# Network
listen=1
port=8338
maxconnections=125

# Performance
dbcache=450

# Pool wallet
wallet=pool
```

### Create Pool Wallet

```bash
# Start daemon
/opt/fullchain/tetsuo-core/build/bin/tetsuod -daemon -conf=$HOME/.tetsuo/tetsuo.conf

# Wait for sync, then create wallet
/opt/fullchain/tetsuo-core/build/bin/tetsuo-cli -conf=$HOME/.tetsuo/tetsuo.conf createwallet "pool"
/opt/fullchain/tetsuo-core/build/bin/tetsuo-cli -conf=$HOME/.tetsuo/tetsuo.conf -rpcwallet=pool getnewaddress
# Save this address - it's your POOL_WALLET_ADDRESS
```

### Create Systemd Service

```bash
sudo nano /etc/systemd/system/tetsuod.service
```

```ini
[Unit]
Description=TETSUO Core Daemon
After=network.target

[Service]
Type=forking
User=root
ExecStart=/opt/fullchain/tetsuo-core/build/bin/tetsuod -daemon -conf=/root/.tetsuo/tetsuo.conf -datadir=/root/.tetsuo
ExecStop=/opt/fullchain/tetsuo-core/build/bin/tetsuo-cli -conf=/root/.tetsuo/tetsuo.conf stop
Restart=on-failure
RestartSec=30

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable tetsuod
sudo systemctl start tetsuod
```

## Step 4: Build ckpool (Stratum Server)

ckpool requires patches for TETSUO compatibility:

```bash
git clone https://bitbucket.org/ckolivas/ckpool.git /opt/ckpool
cd /opt/ckpool
./autogen.sh
./configure
```

### Apply TETSUO Patches

Edit `/opt/ckpool/src/bitcoin.c`:

1. **coinbaseaux.flags** - Make optional (TETSUO returns empty `coinbaseaux: {}`)
2. **Address validation** - Add 'T' prefix support for TETSUO addresses

Then build:

```bash
make
```

### Configure ckpool

```bash
sudo mkdir -p /etc/ckpool /var/log/ckpool
sudo nano /etc/ckpool/ckpool.conf
```

```json
{
    "btcd": [{
        "url": "localhost:8337",
        "auth": "your_rpc_user",
        "pass": "your_rpc_password"
    }],
    "btcaddress": "YOUR_POOL_WALLET_ADDRESS",
    "btcsig": "Your Pool Name",
    "blockpoll": 100,
    "update_interval": 30,
    "serverurl": ["0.0.0.0:3333"],
    "mindiff": 1,
    "startdiff": 500000,
    "maxdiff": 0,
    "logdir": "/var/log/ckpool"
}
```

### Create ckpool Service

```bash
sudo nano /etc/systemd/system/ckpool.service
```

```ini
[Unit]
Description=ckpool Stratum Server
After=network.target tetsuod.service
Requires=tetsuod.service

[Service]
Type=simple
ExecStart=/opt/ckpool/src/ckpool -c /etc/ckpool/ckpool.conf -L
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable ckpool
sudo systemctl start ckpool
```

## Step 5: Setup PostgreSQL

```bash
sudo -u postgres psql
```

```sql
CREATE USER pooluser WITH PASSWORD 'your_secure_db_password';
CREATE DATABASE tetsuo_pool OWNER pooluser;
GRANT ALL PRIVILEGES ON DATABASE tetsuo_pool TO pooluser;
\q
```

## Step 6: Setup Redis

```bash
sudo nano /etc/redis/redis.conf
```

Set:
```ini
appendonly yes
requirepass your_redis_password
```

```bash
sudo systemctl restart redis-server
```

## Step 7: Install Pool Software

```bash
git clone https://github.com/pixelGQ/tetsuo-pool.git /var/www/tetsuo-pool
cd /var/www/tetsuo-pool
npm install
```

### Configure Environment

```bash
cp .env.example .env
nano .env
```

```env
# Database
DATABASE_URL=postgresql://pooluser:your_db_password@localhost:5432/tetsuo_pool

# Redis
REDIS_URL=redis://:your_redis_password@localhost:6379

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
CKPOOL_LOG_DIR=/var/log/ckpool
CKPOOL_LOG_PATH=/var/log/ckpool/ckpool.log

# Worker intervals (ms)
BLOCK_POLL_INTERVAL=5000
PPLNS_POLL_INTERVAL=30000
PAYOUT_INTERVAL=180000
```

### Initialize Database

```bash
npm run db:generate
npm run db:push
```

## Step 8: Setup PM2

```bash
npm install -g pm2

# Build web app
npm run build --workspace=apps/web

# Start services
pm2 start apps/web/ecosystem.config.js
pm2 start apps/workers/ecosystem.config.js
pm2 save
pm2 startup
```

## Step 9: Setup Nginx + SSL

```bash
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
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/tetsuo-pool /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# SSL
sudo certbot --nginx -d your-domain.com
```

## Step 10: Open Firewall Ports

```bash
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 3333/tcp  # Stratum
sudo ufw allow 8338/tcp  # TETSUO P2P
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
│   │   │   └── page.tsx        # Homepage
│   │   └── ecosystem.config.js
│   └── workers/                # Background services
│       ├── src/
│       │   ├── share-parser/   # Parse ckpool logs → DB
│       │   ├── block-watcher/  # Monitor blockchain
│       │   ├── pplns-calculator/ # Calculate rewards
│       │   └── payout-worker/  # Send payouts
│       └── ecosystem.config.js
├── packages/
│   ├── database/               # Prisma schema
│   ├── tetsuo-rpc/             # RPC client
│   └── shared/                 # Common utilities
└── README.md
```

## Workers

| Worker | Description |
|--------|-------------|
| **ShareParser** | Parses ckpool logs and records shares to database |
| **BlockWatcher** | Monitors blockchain for new blocks and confirmations |
| **PPLNSCalculator** | Calculates miner rewards using PPLNS algorithm |
| **PayoutWorker** | Processes and sends payouts to miners |

---

## License

MIT License

## Contributing

Pull requests are welcome. For major changes, please open an issue first.
