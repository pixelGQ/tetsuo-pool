import { NextResponse } from "next/server";
import { prisma } from "@tetsuo-pool/database";

export const dynamic = "force-dynamic";

interface HourlyData {
  hour: string;
  hashrate: number;
  shares: number;
}

export async function GET() {
  try {
    const now = new Date();
    const data: HourlyData[] = [];

    // Get data for last 24 hours, grouped by hour
    for (let i = 23; i >= 0; i--) {
      const hourStart = new Date(now);
      hourStart.setHours(now.getHours() - i, 0, 0, 0);

      const hourEnd = new Date(hourStart);
      hourEnd.setHours(hourStart.getHours() + 1);

      const shares = await prisma.share.aggregate({
        where: {
          submittedAt: {
            gte: hourStart,
            lt: hourEnd,
          },
          isValid: true,
        },
        _sum: { difficulty: true },
        _count: true,
      });

      const totalDifficulty = shares._sum.difficulty ?? 0n;
      // Hashrate = difficulty * 2^32 / 3600 seconds
      const hashrate = (Number(totalDifficulty) * 4294967296) / 3600;

      data.push({
        hour: hourStart.toLocaleTimeString("en-US", { hour: "2-digit", hour12: false }),
        hashrate: Math.round(hashrate),
        shares: shares._count,
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to fetch hashrate history:", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
