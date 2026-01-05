import { prisma, BlockStatus } from "@tetsuo-pool/database";
import { createTetsuoRpc } from "@tetsuo-pool/tetsuo-rpc";
import { POOL_CONFIG, tetsuoToSatoshis } from "@tetsuo-pool/shared";
import { watch } from "chokidar";
import { createReadStream, statSync, existsSync } from "fs";
import { createInterface } from "readline";

const POLL_INTERVAL = parseInt(process.env.BLOCK_POLL_INTERVAL ?? "5000");
const POOL_ADDRESS = process.env.POOL_WALLET_ADDRESS ?? "";
const CKPOOL_LOG_PATH = process.env.CKPOOL_LOG_PATH ?? "/var/log/ckpool/ckpool.log";

// Track file position for incremental reading
let ckpoolLogPosition = 0;

// Regex for block found message: "Solved and confirmed block <height> by <workername>"
const BLOCK_SOLVED_REGEX = /Solved and confirmed block (\d+) by ([^\s]+)/;

const rpc = createTetsuoRpc();

let lastKnownHeight = 0;

/**
 * Check if a block was mined by our pool
 */
async function checkPoolBlock(height: number): Promise<boolean> {
  try {
    const block = await rpc.getBlockByHeight(height);

    // Get coinbase transaction (first tx in block)
    if (!block.tx || block.tx.length === 0) return false;

    // For now, we check if this block's coinbase pays to our pool address
    // This requires examining the transaction details
    // ckpool will log when it finds a block, so we can cross-reference

    // Check ckpool logs for block notification
    // TODO: Parse ckpool block found messages

    return false;
  } catch (err) {
    console.error(`[BlockWatcher] Error checking block ${height}: ${err}`);
    return false;
  }
}

/**
 * Update confirmation counts and mature pending blocks
 */
async function updateBlockConfirmations() {
  const pendingBlocks = await prisma.block.findMany({
    where: { status: BlockStatus.PENDING },
  });

  for (const block of pendingBlocks) {
    try {
      const rpcBlock = await rpc.getBlock(block.hash);

      // Check if block still exists (not orphaned)
      if (!rpcBlock) {
        console.log(`[BlockWatcher] Block ${block.height} orphaned!`);
        await prisma.block.update({
          where: { id: block.id },
          data: { status: BlockStatus.ORPHANED },
        });
        continue;
      }

      const confirmations = rpcBlock.confirmations;

      await prisma.block.update({
        where: { id: block.id },
        data: { confirmations },
      });

      // Check if block is now mature
      if (confirmations >= POOL_CONFIG.blockMaturityConfirmations) {
        console.log(`[BlockWatcher] Block ${block.height} is now mature (${confirmations} confirmations)`);

        await prisma.block.update({
          where: { id: block.id },
          data: { status: BlockStatus.CONFIRMED },
        });

        // Trigger PPLNS calculation for this block
        await triggerPplnsCalculation(block.id);
      }
    } catch (err) {
      console.error(`[BlockWatcher] Error updating block ${block.height}: ${err}`);
    }
  }
}

/**
 * Trigger PPLNS reward calculation for a confirmed block
 */
async function triggerPplnsCalculation(blockId: string) {
  // This will be handled by the PPLNS calculator worker
  // For now, we just log it
  console.log(`[BlockWatcher] Block ${blockId} ready for PPLNS calculation`);

  // TODO: Send message to PPLNS calculator via Redis pub/sub
}

/**
 * Record a new pool block found
 */
async function recordPoolBlock(height: number, hash: string, foundBy: string) {
  // Parse worker info
  const parts = foundBy.split(".");
  const address = parts[0];

  const user = await prisma.user.findUnique({
    where: { address },
  });

  if (!user) {
    console.error(`[BlockWatcher] Block found by unknown user: ${address}`);
    return;
  }

  const workerName = parts[1] || "default";
  const worker = await prisma.worker.findUnique({
    where: {
      userId_name: {
        userId: user.id,
        name: workerName,
      },
    },
  });

  await prisma.block.create({
    data: {
      height,
      hash,
      reward: tetsuoToSatoshis(POOL_CONFIG.blockReward),
      difficulty: BigInt(1), // Will be updated from RPC
      foundByUserId: user.id,
      foundByWorkerId: worker?.id,
      status: BlockStatus.PENDING,
      confirmations: 0,
    },
  });

  console.log(`[BlockWatcher] New pool block recorded: height=${height}, hash=${hash}, foundBy=${foundBy}`);
}

/**
 * Process ckpool log file for block found messages
 */
async function processCkpoolLog(): Promise<number> {
  let blocksFound = 0;

  if (!existsSync(CKPOOL_LOG_PATH)) {
    return 0;
  }

  try {
    const stat = statSync(CKPOOL_LOG_PATH);

    // File was truncated or rotated
    if (stat.size < ckpoolLogPosition) {
      console.log("[BlockWatcher] ckpool log rotated, resetting position");
      ckpoolLogPosition = 0;
    }

    // No new content
    if (stat.size === ckpoolLogPosition) return 0;

    const stream = createReadStream(CKPOOL_LOG_PATH, {
      start: ckpoolLogPosition,
      encoding: "utf8",
    });

    const rl = createInterface({ input: stream });

    for await (const line of rl) {
      const match = line.match(BLOCK_SOLVED_REGEX);
      if (match) {
        const height = parseInt(match[1], 10);
        const workername = match[2];

        console.log(`[BlockWatcher] Detected block solved: height=${height}, worker=${workername}`);

        // Check if we already have this block
        const existingBlock = await prisma.block.findUnique({
          where: { height },
        });

        if (!existingBlock) {
          try {
            const hash = await rpc.getBlockHash(height);
            await recordPoolBlock(height, hash, workername);
            blocksFound++;
          } catch (err) {
            console.error(`[BlockWatcher] Error recording block ${height}: ${err}`);
          }
        }
      }
    }

    ckpoolLogPosition = stat.size;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error(`[BlockWatcher] Error reading ckpool log: ${err}`);
    }
  }

  return blocksFound;
}

/**
 * Watch for ckpool block found notifications
 */
async function watchCkpoolBlocks() {
  console.log(`[BlockWatcher] Watching ckpool log: ${CKPOOL_LOG_PATH}`);

  // Initial processing
  const initialBlocks = await processCkpoolLog();
  if (initialBlocks > 0) {
    console.log(`[BlockWatcher] Initial processing: ${initialBlocks} blocks`);
  }

  if (!existsSync(CKPOOL_LOG_PATH)) {
    console.warn(`[BlockWatcher] ckpool log not found: ${CKPOOL_LOG_PATH}`);
    return;
  }

  // Watch for changes
  const watcher = watch(CKPOOL_LOG_PATH, {
    persistent: true,
    usePolling: true,
    interval: 2000,
  });

  watcher.on("change", async () => {
    const blocks = await processCkpoolLog();
    if (blocks > 0) {
      console.log(`[BlockWatcher] Found ${blocks} new block(s) in ckpool log`);
    }
  });

  watcher.on("error", (error) => {
    console.error(`[BlockWatcher] Watcher error: ${error}`);
  });
}

/**
 * Main polling loop
 */
async function pollBlocks() {
  try {
    const currentHeight = await rpc.getBlockCount();

    if (currentHeight > lastKnownHeight) {
      console.log(`[BlockWatcher] New blocks: ${lastKnownHeight} -> ${currentHeight}`);

      // Check each new block
      for (let h = lastKnownHeight + 1; h <= currentHeight; h++) {
        const isPoolBlock = await checkPoolBlock(h);
        if (isPoolBlock) {
          const hash = await rpc.getBlockHash(h);
          // Note: foundBy should come from ckpool logs
          await recordPoolBlock(h, hash, "unknown");
        }
      }

      lastKnownHeight = currentHeight;
    }

    // Update confirmations for pending blocks
    await updateBlockConfirmations();

  } catch (err) {
    console.error(`[BlockWatcher] Poll error: ${err}`);
  }
}

/**
 * Start the block watcher
 */
export async function startBlockWatcher() {
  console.log("[BlockWatcher] Starting...");

  // Get initial block height
  try {
    lastKnownHeight = await rpc.getBlockCount();
    console.log(`[BlockWatcher] Current block height: ${lastKnownHeight}`);
  } catch (err) {
    console.error(`[BlockWatcher] Failed to get initial block height: ${err}`);
    lastKnownHeight = 0;
  }

  // Start polling loop
  setInterval(pollBlocks, POLL_INTERVAL);

  // Also watch ckpool logs for block notifications
  await watchCkpoolBlocks();

  console.log(`[BlockWatcher] Polling every ${POLL_INTERVAL}ms`);
}

// Run if executed directly
if (require.main === module) {
  startBlockWatcher().catch(console.error);
}
