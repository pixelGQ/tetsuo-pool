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
      {/* Hero */}
      <div className="text-center py-4">
        <h1 className="text-3xl md:text-5xl font-black tracking-tight uppercase">
          TETSUO Mining Pool
        </h1>
        <p className="text-[--text-muted] text-sm md:text-base mt-2 uppercase tracking-wide">
          Public PPLNS Pool • {stats.poolFee}% Fee
        </p>
      </div>

      {/* Pool Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
        <div className="manga-card p-4 md:p-6">
          <div className="text-[--text-muted] text-xs md:text-sm uppercase tracking-wide">Pool Hashrate</div>
          <div className="stat-number mt-1">{formatHashrate(stats.hashrate)}</div>
        </div>
        <div className="manga-card p-4 md:p-6">
          <div className="text-[--text-muted] text-xs md:text-sm uppercase tracking-wide">Active Miners</div>
          <div className="stat-number mt-1">{stats.miners}</div>
        </div>
        <div className="manga-card p-4 md:p-6">
          <div className="text-[--text-muted] text-xs md:text-sm uppercase tracking-wide">Online Workers</div>
          <div className="stat-number mt-1">{stats.workers}</div>
        </div>
        <div className="manga-card p-4 md:p-6">
          <div className="text-[--text-muted] text-xs md:text-sm uppercase tracking-wide">Blocks Found</div>
          <div className="stat-number mt-1">{stats.blocks}</div>
        </div>
        <div className="manga-card p-4 md:p-6 col-span-2 md:col-span-1">
          <div className="text-[--text-muted] text-xs md:text-sm uppercase tracking-wide">Mined (24h)</div>
          <div className="stat-number mt-1">
            {Number(formatTetsuo(stats.minedLast24h, 0)).toLocaleString()}
          </div>
          <div className="text-[--text-muted] text-xs">{stats.blocksFoundLast24h} blocks</div>
        </div>
      </div>

      {/* Hashrate Chart */}
      <div className="manga-card p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-black uppercase tracking-wide mb-4">Pool Hashrate (24h)</h2>
        <HashrateChart />
      </div>

      {/* How to Connect */}
      <ConnectSection minPayout={stats.minPayout} />

      {/* Pool Info */}
      <div className="manga-card p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-black uppercase tracking-wide mb-4">Pool Information</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 text-xs md:text-sm">
          <div className="flex justify-between border-b border-[--border-light] pb-2">
            <span className="text-[--text-muted] uppercase">Algorithm</span>
            <span className="font-bold">SHA-256</span>
          </div>
          <div className="flex justify-between border-b border-[--border-light] pb-2">
            <span className="text-[--text-muted] uppercase">Pool Fee</span>
            <span className="font-bold">{stats.poolFee}%</span>
          </div>
          <div className="flex justify-between border-b border-[--border-light] pb-2">
            <span className="text-[--text-muted] uppercase">Payout Model</span>
            <span className="font-bold">PPLNS</span>
          </div>
          <div className="flex justify-between border-b border-[--border-light] pb-2">
            <span className="text-[--text-muted] uppercase">Min Payout</span>
            <span className="font-bold">{stats.minPayout} TETSUO</span>
          </div>
          <div className="flex justify-between border-b border-[--border-light] pb-2">
            <span className="text-[--text-muted] uppercase">Payout</span>
            <span className="font-bold">Automatic</span>
          </div>
          <div className="flex justify-between border-b border-[--border-light] pb-2">
            <span className="text-[--text-muted] uppercase">Block Time</span>
            <span className="font-bold">60 sec</span>
          </div>
        </div>
      </div>
    </div>
  );
}
