import { NextRequest, NextResponse } from "next/server";
import { createTetsuoRpc } from "@tetsuo-pool/tetsuo-rpc";
import { POOL_CONFIG } from "@tetsuo-pool/shared";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

// Disable caching for this route
export const dynamic = "force-dynamic";
export const revalidate = 0;

const rpc = createTetsuoRpc();

export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimited = await checkRateLimit(request, RATE_LIMITS.network);
  if (rateLimited) return rateLimited;
  try {
    const [blockchainInfo, networkHashrate] = await Promise.all([
      rpc.getBlockchainInfo(),
      rpc.getNetworkHashPs(120), // 120 blocks average
    ]);

    // Calculate average block time from last 100 blocks
    let avgBlockTime = 60; // default
    const currentHeight = blockchainInfo.blocks;
    const blocksToCheck = 100;

    if (currentHeight >= blocksToCheck) {
      const [latestBlock, oldBlock] = await Promise.all([
        rpc.getBlockByHeight(currentHeight),
        rpc.getBlockByHeight(currentHeight - blocksToCheck),
      ]);
      const timeDiff = latestBlock.time - oldBlock.time;
      avgBlockTime = Math.round(timeDiff / blocksToCheck);
    }

    return NextResponse.json(
      {
        blockHeight: blockchainInfo.blocks,
        difficulty: blockchainInfo.difficulty,
        networkHashrate: networkHashrate,
        blockReward: POOL_CONFIG.blockReward,
        chain: blockchainInfo.chain,
        syncing: blockchainInfo.initialblockdownload,
        headers: blockchainInfo.headers,
        avgBlockTime,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching network stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch network stats. Node may be offline." },
      { status: 500 }
    );
  }
}
