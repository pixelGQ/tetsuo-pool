import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@tetsuo-pool/database";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;

    // Find user by address
    const user = await prisma.user.findUnique({
      where: { address },
      include: {
        workers: {
          orderBy: { lastSeen: "desc" },
        },
        payouts: {
          take: 10,
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: {
            shares: true,
            blocksFound: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Miner not found" }, { status: 404 });
    }

    // Get recent shares stats
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentShares = await prisma.share.aggregate({
      where: {
        userId: user.id,
        submittedAt: { gte: oneHourAgo },
      },
      _sum: { difficulty: true },
      _count: true,
    });

    // Estimate hashrate
    const difficulty = recentShares._sum.difficulty ?? 0n;
    const hashrate = (Number(difficulty) * 4294967296) / 3600;

    return NextResponse.json({
      address: user.address,
      pendingBalance: user.pendingBalance.toString(),
      paidBalance: user.paidBalance.toString(),
      totalShares: user._count.shares,
      blocksFound: user._count.blocksFound,
      hashrate: Math.round(hashrate),
      sharesLastHour: recentShares._count,
      workers: user.workers.map((w) => ({
        name: w.name,
        isOnline: w.isOnline,
        lastSeen: w.lastSeen,
      })),
      recentPayouts: user.payouts.map((p) => ({
        amount: p.amount.toString(),
        txid: p.txid,
        status: p.status,
        createdAt: p.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching miner stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch miner stats" },
      { status: 500 }
    );
  }
}
