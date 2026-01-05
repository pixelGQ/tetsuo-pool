import { prisma, PayoutStatus } from "@tetsuo-pool/database";
import { createTetsuoRpc } from "@tetsuo-pool/tetsuo-rpc";
import { POOL_CONFIG, satoshisToTetsuo, tetsuoToSatoshis } from "@tetsuo-pool/shared";

const PAYOUT_INTERVAL = parseInt(process.env.PAYOUT_INTERVAL ?? "3600000"); // 1 hour default
const MIN_PAYOUT = tetsuoToSatoshis(POOL_CONFIG.minPayoutThreshold);

const rpc = createTetsuoRpc();

/**
 * Process automatic payouts for users who have reached the threshold
 */
export async function processPayouts() {
  console.log("[Payout] Starting payout processing...");

  // Find users with pending balance above threshold
  const eligibleUsers = await prisma.user.findMany({
    where: {
      pendingBalance: {
        gte: MIN_PAYOUT,
      },
      payoutEnabled: true,
    },
  });

  if (eligibleUsers.length === 0) {
    console.log("[Payout] No users eligible for payout");
    return;
  }

  console.log(`[Payout] Found ${eligibleUsers.length} eligible users`);

  // Check wallet balance
  let walletBalance: number;
  try {
    walletBalance = await rpc.getBalance();
  } catch (err) {
    console.error(`[Payout] Failed to get wallet balance: ${err}`);
    return;
  }

  console.log(`[Payout] Pool wallet balance: ${walletBalance} TETSUO`);

  for (const user of eligibleUsers) {
    // Skip if user has no address set
    if (!user.address) {
      console.log(`[Payout] User ${user.id} has no address, skipping`);
      continue;
    }

    const payoutAmount = user.pendingBalance;
    const payoutTetsuo = satoshisToTetsuo(payoutAmount);

    // Check if we have enough balance
    if (payoutTetsuo > walletBalance) {
      console.warn(
        `[Payout] Insufficient balance for user ${user.id}: need ${payoutTetsuo}, have ${walletBalance}`
      );
      continue;
    }

    // Validate address
    try {
      const validation = await rpc.validateAddress(user.address);
      if (!validation.isvalid) {
        console.error(`[Payout] Invalid address for user ${user.id}: ${user.address}`);
        continue;
      }
    } catch (err) {
      console.error(`[Payout] Failed to validate address for user ${user.id}: ${err}`);
      continue;
    }

    // Create payout record
    const payout = await prisma.payout.create({
      data: {
        userId: user.id,
        amount: payoutAmount,
        address: user.address,
        status: PayoutStatus.PENDING,
      },
    });

    console.log(
      `[Payout] Processing payout ${payout.id}: ${payoutTetsuo} TETSUO to ${user.address}`
    );

    try {
      // Send transaction
      const txid = await rpc.sendToAddress(
        user.address,
        payoutTetsuo,
        `Pool payout to ${user.username || user.address}`
      );

      // Update payout with txid
      await prisma.payout.update({
        where: { id: payout.id },
        data: {
          txid,
          status: PayoutStatus.SENT,
        },
      });

      // Deduct from user's pending balance
      await prisma.user.update({
        where: { id: user.id },
        data: {
          pendingBalance: {
            decrement: payoutAmount,
          },
          paidBalance: {
            increment: payoutAmount,
          },
        },
      });

      walletBalance -= payoutTetsuo;

      console.log(`[Payout] Sent ${payoutTetsuo} TETSUO to ${user.address}, txid: ${txid}`);

    } catch (err) {
      console.error(`[Payout] Failed to send payout ${payout.id}: ${err}`);

      await prisma.payout.update({
        where: { id: payout.id },
        data: {
          status: PayoutStatus.FAILED,
        },
      });
    }
  }

  console.log("[Payout] Payout processing complete");
}

/**
 * Confirm pending payouts by checking transaction confirmations
 */
export async function confirmPayouts() {
  const sentPayouts = await prisma.payout.findMany({
    where: {
      status: PayoutStatus.SENT,
      txid: { not: null },
    },
  });

  if (sentPayouts.length === 0) return;

  console.log(`[Payout] Checking ${sentPayouts.length} sent payouts for confirmation`);

  for (const payout of sentPayouts) {
    if (!payout.txid) continue;

    try {
      const tx = await rpc.getTransaction(payout.txid);

      if (tx.confirmations >= 6) {
        await prisma.payout.update({
          where: { id: payout.id },
          data: {
            status: PayoutStatus.CONFIRMED,
            processedAt: new Date(),
          },
        });

        console.log(`[Payout] Payout ${payout.id} confirmed (${tx.confirmations} confirmations)`);
      }
    } catch (err) {
      console.error(`[Payout] Error checking payout ${payout.id}: ${err}`);
    }
  }
}

/**
 * Start the payout worker
 */
export async function startPayoutWorker() {
  console.log("[Payout] Starting Payout Worker...");
  console.log(`[Payout] Minimum payout threshold: ${POOL_CONFIG.minPayoutThreshold} TETSUO`);

  // Process payouts on startup
  await processPayouts();
  await confirmPayouts();

  // Schedule periodic payout processing
  setInterval(async () => {
    try {
      await processPayouts();
      await confirmPayouts();
    } catch (err) {
      console.error(`[Payout] Worker error: ${err}`);
    }
  }, PAYOUT_INTERVAL);

  console.log(`[Payout] Processing payouts every ${PAYOUT_INTERVAL / 1000} seconds`);
}

// Run if executed directly
if (require.main === module) {
  startPayoutWorker().catch(console.error);
}
