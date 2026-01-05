import { prisma, BlockStatus, Prisma } from "@tetsuo-pool/database";
import { POOL_CONFIG, satoshisToTetsuo } from "@tetsuo-pool/shared";

/**
 * PPLNS (Pay Per Last N Shares) Calculator
 *
 * When a block is found and confirmed:
 * 1. Get all valid shares submitted in the PPLNS window before block was found
 * 2. Calculate each user's share of the reward based on their difficulty contribution
 * 3. Apply pool fee
 * 4. Credit rewards to user balances
 */

interface UserShareSummary {
  userId: string;
  totalDifficulty: string | bigint; // Prisma $queryRaw returns Decimal as string
}

/**
 * Calculate PPLNS rewards for a confirmed block
 */
export async function calculatePplnsRewards(blockId: string) {
  console.log(`[PPLNS] Starting calculation for block ${blockId}`);

  // Get the block
  const block = await prisma.block.findUnique({
    where: { id: blockId },
  });

  if (!block) {
    console.error(`[PPLNS] Block ${blockId} not found`);
    return;
  }

  if (block.status !== BlockStatus.CONFIRMED) {
    console.error(`[PPLNS] Block ${blockId} is not confirmed (status: ${block.status})`);
    return;
  }

  // Check if rewards already calculated
  const existingRewards = await prisma.blockReward.count({
    where: { blockId: block.id },
  });

  if (existingRewards > 0) {
    console.log(`[PPLNS] Rewards already calculated for block ${blockId}`);
    return;
  }

  // Calculate PPLNS window
  const windowEnd = block.foundAt;
  const windowStart = new Date(windowEnd.getTime() - POOL_CONFIG.pplnsWindowMinutes * 60 * 1000);

  console.log(`[PPLNS] Window: ${windowStart.toISOString()} to ${windowEnd.toISOString()}`);

  // Get all valid shares in the window, grouped by user
  const userShares = await prisma.$queryRaw<UserShareSummary[]>`
    SELECT
      "userId",
      SUM(difficulty) as "totalDifficulty"
    FROM "Share"
    WHERE "submittedAt" >= ${windowStart}
      AND "submittedAt" <= ${windowEnd}
      AND "isValid" = true
    GROUP BY "userId"
  `;

  if (userShares.length === 0) {
    console.log(`[PPLNS] No shares found in window for block ${blockId}`);
    return;
  }

  // Calculate total difficulty (convert from raw query result - Prisma returns Decimal, not BigInt)
  const totalDifficulty = userShares.reduce((sum, u) => sum + BigInt(String(u.totalDifficulty)), 0n);

  if (totalDifficulty === 0n) {
    console.error(`[PPLNS] Total difficulty is 0 for block ${blockId}`);
    return;
  }

  // Calculate pool fee
  const feePercent = POOL_CONFIG.feePercent;
  const blockReward = block.reward;
  const poolFee = (blockReward * BigInt(Math.floor(feePercent * 100))) / 10000n;
  const distributableReward = blockReward - poolFee;

  console.log(`[PPLNS] Block reward: ${satoshisToTetsuo(blockReward)} TETSUO`);
  console.log(`[PPLNS] Pool fee (${feePercent}%): ${satoshisToTetsuo(poolFee)} TETSUO`);
  console.log(`[PPLNS] Distributable: ${satoshisToTetsuo(distributableReward)} TETSUO`);
  console.log(`[PPLNS] Total difficulty: ${totalDifficulty}`);
  console.log(`[PPLNS] Participants: ${userShares.length}`);

  // Calculate and save rewards for each user
  const rewards: { userId: string; amount: bigint; percent: number }[] = [];

  for (const userShare of userShares) {
    // Calculate user's share: (userDiff / totalDiff) * distributableReward
    const userDifficulty = BigInt(String(userShare.totalDifficulty));
    const userReward = (distributableReward * userDifficulty) / totalDifficulty;

    const percent = (Number(userDifficulty) / Number(totalDifficulty)) * 100;

    rewards.push({
      userId: userShare.userId,
      amount: userReward,
      percent,
    });
  }

  // Use transaction to ensure atomicity
  await prisma.$transaction(async (tx) => {
    // Create block rewards
    for (const reward of rewards) {
      await tx.blockReward.create({
        data: {
          blockId: block.id,
          userId: reward.userId,
          sharePercent: reward.percent,
          amount: reward.amount,
        },
      });

      // Add to user's pending balance
      await tx.user.update({
        where: { id: reward.userId },
        data: {
          pendingBalance: {
            increment: reward.amount,
          },
        },
      });

      console.log(
        `[PPLNS] User ${reward.userId}: ${reward.percent.toFixed(2)}% = ${satoshisToTetsuo(reward.amount)} TETSUO`
      );
    }
  });

  console.log(`[PPLNS] Rewards distributed for block ${blockId}`);
}

/**
 * Process all confirmed blocks that haven't had rewards calculated
 */
export async function processUnprocessedBlocks() {
  const confirmedBlocks = await prisma.block.findMany({
    where: {
      status: BlockStatus.CONFIRMED,
    },
    include: {
      _count: {
        select: { rewards: true },
      },
    },
  });

  const unprocessedBlocks = confirmedBlocks.filter((b) => b._count.rewards === 0);

  console.log(`[PPLNS] Found ${unprocessedBlocks.length} unprocessed confirmed blocks`);

  for (const block of unprocessedBlocks) {
    await calculatePplnsRewards(block.id);
  }
}

/**
 * Start the PPLNS calculator worker
 */
export async function startPplnsCalculator() {
  console.log("[PPLNS] Starting PPLNS Calculator...");

  // Process any unprocessed blocks on startup
  await processUnprocessedBlocks();

  // Poll for new confirmed blocks periodically
  const pollInterval = parseInt(process.env.PPLNS_POLL_INTERVAL ?? "60000");

  setInterval(async () => {
    try {
      await processUnprocessedBlocks();
    } catch (err) {
      console.error(`[PPLNS] Error processing blocks: ${err}`);
    }
  }, pollInterval);

  console.log(`[PPLNS] Polling every ${pollInterval}ms`);

  // TODO: Also subscribe to Redis pub/sub for immediate block notifications
}

// Run if executed directly
if (require.main === module) {
  startPplnsCalculator().catch(console.error);
}
