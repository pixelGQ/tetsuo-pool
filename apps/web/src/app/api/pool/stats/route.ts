import { NextResponse } from "next/server";
import { prisma } from "@tetsuo-pool/database";
import { POOL_CONFIG } from "@tetsuo-pool/shared";

export async function GET() {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const [userCount, workerCount, blockCount, latestBlock, recentShares] =
      await Promise.all([
        prisma.user.count(),
        prisma.worker.count({ where: { isOnline: true } }),
        prisma.block.count(),
        prisma.block.findFirst({ orderBy: { foundAt: "desc" } }),
        prisma.share.aggregate({
          where: { submittedAt: { gte: oneHourAgo } },
          _sum: { difficulty: true },
        }),
      ]);

    // Estimate hashrate from recent shares
    const totalDifficulty = recentShares._sum.difficulty ?? 0n;
    const hashrate = (Number(totalDifficulty) * 4294967296) / 3600;

    return NextResponse.json({
      miners: userCount,
      workers: workerCount,
      blocks: blockCount,
      hashrate: Math.round(hashrate),
      lastBlockHeight: latestBlock?.height ?? null,
      lastBlockTime: latestBlock?.foundAt ?? null,
      poolFee: POOL_CONFIG.feePercent,
      minPayout: POOL_CONFIG.minPayoutThreshold,
      pplnsWindow: POOL_CONFIG.pplnsWindowMinutes,
    });
  } catch (error) {
    console.error("Error fetching pool stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch pool stats" },
      { status: 500 }
    );
  }
}
