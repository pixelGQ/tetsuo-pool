import { prisma } from "@tetsuo-pool/database";
import { formatHashrate, formatTetsuo } from "@tetsuo-pool/shared";

// Force dynamic rendering - don't cache this page
export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getDetailedStats() {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    activeWorkers,
    totalBlocks,
    confirmedBlocks,
    pendingBlocks,
    orphanedBlocks,
    hourShares,
    dayShares,
    recentBlocks,
    topMiners,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.worker.count({ where: { isOnline: true } }),
    prisma.block.count(),
    prisma.block.count({ where: { status: "CONFIRMED" } }),
    prisma.block.count({ where: { status: "PENDING" } }),
    prisma.block.count({ where: { status: "ORPHANED" } }),
    prisma.share.aggregate({
      where: { submittedAt: { gte: oneHourAgo } },
      _sum: { difficulty: true },
      _count: true,
    }),
    prisma.share.aggregate({
      where: { submittedAt: { gte: oneDayAgo } },
      _sum: { difficulty: true },
      _count: true,
    }),
    prisma.block.findMany({
      take: 10,
      orderBy: { foundAt: "desc" },
      include: { foundByUser: true },
    }),
    prisma.user.findMany({
      take: 10,
      orderBy: { pendingBalance: "desc" },
      select: { address: true, pendingBalance: true, paidBalance: true },
    }),
  ]);

  // Estimate hashrate from shares
  const hourDifficulty = hourShares._sum.difficulty ?? 0n;
  const hourHashrate = (Number(hourDifficulty) * 4294967296) / 3600;

  return {
    totalUsers,
    activeWorkers,
    blocks: { total: totalBlocks, confirmed: confirmedBlocks, pending: pendingBlocks, orphaned: orphanedBlocks },
    shares: { hourCount: hourShares._count, dayCount: dayShares._count },
    hashrate: hourHashrate,
    recentBlocks,
    topMiners,
  };
}

export default async function StatsPage() {
  const stats = await getDetailedStats();

  return (
    <div className="space-y-4 md:space-y-8">
      <h1 className="text-2xl md:text-3xl font-bold">Pool Statistics</h1>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-gray-800 rounded-lg p-4 md:p-6">
          <div className="text-gray-400 text-xs md:text-sm">Pool Hashrate</div>
          <div className="text-lg md:text-2xl font-bold">{formatHashrate(stats.hashrate)}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 md:p-6">
          <div className="text-gray-400 text-xs md:text-sm">Total Miners</div>
          <div className="text-lg md:text-2xl font-bold">{stats.totalUsers}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 md:p-6">
          <div className="text-gray-400 text-xs md:text-sm">Online Workers</div>
          <div className="text-lg md:text-2xl font-bold">{stats.activeWorkers}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 md:p-6">
          <div className="text-gray-400 text-xs md:text-sm">Shares (1h)</div>
          <div className="text-lg md:text-2xl font-bold">{stats.shares.hourCount.toLocaleString()}</div>
        </div>
      </div>

      {/* Block Stats */}
      <div className="bg-gray-800 rounded-lg p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-bold mb-3 md:mb-4">Block Statistics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div>
            <div className="text-gray-400 text-xs md:text-sm">Total</div>
            <div className="text-lg md:text-xl font-bold">{stats.blocks.total}</div>
          </div>
          <div>
            <div className="text-gray-400 text-xs md:text-sm">Confirmed</div>
            <div className="text-lg md:text-xl font-bold text-green-400">{stats.blocks.confirmed}</div>
          </div>
          <div>
            <div className="text-gray-400 text-xs md:text-sm">Pending</div>
            <div className="text-lg md:text-xl font-bold text-yellow-400">{stats.blocks.pending}</div>
          </div>
          <div>
            <div className="text-gray-400 text-xs md:text-sm">Orphaned</div>
            <div className="text-lg md:text-xl font-bold text-red-400">{stats.blocks.orphaned}</div>
          </div>
        </div>
      </div>

      {/* Recent Blocks */}
      <div className="bg-gray-800 rounded-lg p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-bold mb-3 md:mb-4">Recent Blocks</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs md:text-sm min-w-[500px]">
            <thead>
              <tr className="text-gray-400 border-b border-gray-700">
                <th className="text-left py-2">Height</th>
                <th className="text-left py-2">Hash</th>
                <th className="text-left py-2 hidden md:table-cell">Found By</th>
                <th className="text-left py-2">Reward</th>
                <th className="text-left py-2">Status</th>
                <th className="text-left py-2 hidden md:table-cell">Time</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentBlocks.map((block) => (
                <tr key={block.id} className="border-b border-gray-700/50">
                  <td className="py-2">{block.height}</td>
                  <td className="py-2 font-mono text-xs">
                    {block.hash.slice(0, 10)}...
                  </td>
                  <td className="py-2 hidden md:table-cell">
                    {block.foundByUser?.address.slice(0, 12)}...
                  </td>
                  <td className="py-2 whitespace-nowrap">{formatTetsuo(block.reward)}</td>
                  <td className="py-2">
                    <span
                      className={`px-1.5 md:px-2 py-0.5 md:py-1 rounded text-xs ${
                        block.status === "CONFIRMED"
                          ? "bg-green-900 text-green-300"
                          : block.status === "PENDING"
                          ? "bg-yellow-900 text-yellow-300"
                          : "bg-red-900 text-red-300"
                      }`}
                    >
                      {block.status.slice(0, 4)}
                    </span>
                  </td>
                  <td className="py-2 text-gray-400 hidden md:table-cell">
                    {block.foundAt.toLocaleString()}
                  </td>
                </tr>
              ))}
              {stats.recentBlocks.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-gray-400">
                    No blocks found yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Miners */}
      <div className="bg-gray-800 rounded-lg p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-bold mb-3 md:mb-4">Top Miners</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs md:text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-gray-700">
                <th className="text-left py-2">#</th>
                <th className="text-left py-2">Address</th>
                <th className="text-left py-2">Pending</th>
                <th className="text-left py-2 hidden md:table-cell">Total Paid</th>
              </tr>
            </thead>
            <tbody>
              {stats.topMiners.map((miner, i) => (
                <tr key={miner.address} className="border-b border-gray-700/50">
                  <td className="py-2">{i + 1}</td>
                  <td className="py-2 font-mono text-xs">{miner.address.slice(0, 12)}...</td>
                  <td className="py-2 whitespace-nowrap">{formatTetsuo(miner.pendingBalance)}</td>
                  <td className="py-2 whitespace-nowrap hidden md:table-cell">{formatTetsuo(miner.paidBalance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
