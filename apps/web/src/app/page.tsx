import { prisma, BlockStatus } from "@tetsuo-pool/database";
import { formatHashrate, formatTetsuo, POOL_CONFIG } from "@tetsuo-pool/shared";
import { ConnectSection } from "./components/ConnectSection";
import { HashrateChart } from "./components/HashrateChart";

// Force dynamic rendering - don't cache this page
export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getPoolStats() {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const [
    userCount,
    workerCount,
    blockCount,
    latestBlock,
    recentShares,
    blocksLast24h,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.worker.count({ where: { isOnline: true } }),
    prisma.block.count(),
    prisma.block.findFirst({ orderBy: { foundAt: "desc" } }),
    prisma.share.aggregate({
      where: { submittedAt: { gte: oneHourAgo } },
      _sum: { difficulty: true },
    }),
    prisma.block.aggregate({
      where: {
        foundAt: { gte: oneDayAgo },
        status: { not: BlockStatus.ORPHANED },
      },
      _sum: { reward: true },
      _count: true,
    }),
  ]);

  // Estimate hashrate: difficulty * 2^32 / 3600 seconds
  const totalDifficulty = recentShares._sum.difficulty ?? 0n;
  const hashrate = (Number(totalDifficulty) * 4294967296) / 3600;

  // Mined in last 24h
  const minedLast24h = blocksLast24h._sum.reward ?? 0n;
  const blocksFoundLast24h = blocksLast24h._count;

  return {
    miners: userCount,
    workers: workerCount,
    blocks: blockCount,
    hashrate,
    lastBlock: latestBlock?.foundAt,
    poolFee: POOL_CONFIG.feePercent,
    minPayout: POOL_CONFIG.minPayoutThreshold,
    minedLast24h,
    blocksFoundLast24h,
  };
}

export default async function HomePage() {
  const stats = await getPoolStats();

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="text-center">
        <h1 className="text-2xl md:text-4xl font-bold mb-2">TETSUO Mining Pool</h1>
        <p className="text-gray-400 text-sm md:text-base">
          Public PPLNS mining pool with {stats.poolFee}% fee
        </p>
      </div>

      {/* Pool Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
        <div className="bg-gray-800 rounded-lg p-4 md:p-6">
          <div className="text-gray-400 text-xs md:text-sm">Pool Hashrate</div>
          <div className="text-lg md:text-2xl font-bold">{formatHashrate(stats.hashrate)}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 md:p-6">
          <div className="text-gray-400 text-xs md:text-sm">Active Miners</div>
          <div className="text-lg md:text-2xl font-bold">{stats.miners}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 md:p-6">
          <div className="text-gray-400 text-xs md:text-sm">Online Workers</div>
          <div className="text-lg md:text-2xl font-bold">{stats.workers}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 md:p-6">
          <div className="text-gray-400 text-xs md:text-sm">Blocks Found</div>
          <div className="text-lg md:text-2xl font-bold">{stats.blocks}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 md:p-6 col-span-2 md:col-span-1">
          <div className="text-gray-400 text-xs md:text-sm">Mined (24h)</div>
          <div className="text-lg md:text-2xl font-bold text-green-400">
            {Number(formatTetsuo(stats.minedLast24h, 0)).toLocaleString()}
          </div>
          <div className="text-gray-500 text-xs">{stats.blocksFoundLast24h} blocks</div>
        </div>
      </div>

      {/* Hashrate Chart */}
      <div className="bg-gray-800 rounded-lg p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-bold mb-4">Pool Hashrate (24h)</h2>
        <HashrateChart />
      </div>

      {/* How to Connect */}
      <ConnectSection minPayout={stats.minPayout} />

      {/* Pool Info */}
      <div className="bg-gray-800 rounded-lg p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-bold mb-4">Pool Information</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 text-xs md:text-sm">
          <div>
            <span className="text-gray-400">Algorithm:</span>
            <span className="ml-1 md:ml-2">SHA-256</span>
          </div>
          <div>
            <span className="text-gray-400">Pool Fee:</span>
            <span className="ml-1 md:ml-2">{stats.poolFee}%</span>
          </div>
          <div>
            <span className="text-gray-400">Payout Model:</span>
            <span className="ml-1 md:ml-2">PPLNS</span>
          </div>
          <div>
            <span className="text-gray-400">Min Payout:</span>
            <span className="ml-1 md:ml-2">{stats.minPayout} TETSUO</span>
          </div>
          <div>
            <span className="text-gray-400">Payout:</span>
            <span className="ml-1 md:ml-2">Hourly</span>
          </div>
          <div>
            <span className="text-gray-400">Block Time:</span>
            <span className="ml-1 md:ml-2">60 sec</span>
          </div>
        </div>
      </div>
    </div>
  );
}
