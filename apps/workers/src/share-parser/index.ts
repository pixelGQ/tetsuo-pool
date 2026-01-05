import { watch } from "chokidar";
import { createReadStream, statSync, readdirSync, existsSync } from "fs";
import { createInterface } from "readline";
import { join } from "path";
import { prisma } from "@tetsuo-pool/database";

const CKPOOL_LOG_DIR = process.env.CKPOOL_LOG_DIR ?? "/var/log/ckpool";

// Track file positions for each sharelog file
const filePositions = new Map<string, number>();

interface CkpoolShare {
  workinfoid: number;
  clientid: number;
  enonce1: string;
  nonce2: string;
  nonce: string;
  ntime: string;
  diff: number;       // Required difficulty
  sdiff: number;      // Actual share difficulty
  hash: string;
  result: boolean;    // true = accepted, false = rejected
  "reject-reason"?: string;
  errn: number;
  createdate: string; // Format: "2024-01-15 12:30:45.123456"
  workername: string; // Format: "address.worker" or "address"
  username: string;   // Wallet address
  address: string;    // Client IP
  agent: string;      // Mining software
}

/**
 * Parse createdate string to Date
 * ckpool format: "seconds,nanoseconds" (Unix timestamp)
 */
function parseCreateDate(createdate: string): Date {
  const [seconds, nanoseconds] = createdate.split(",");
  const ms = Math.floor(parseInt(nanoseconds || "0") / 1000000);
  return new Date(parseInt(seconds) * 1000 + ms);
}

/**
 * Get or create user and worker from share data
 */
async function getOrCreateWorker(share: CkpoolShare) {
  const address = share.username;
  const parts = share.workername.split(".");
  const workerName = parts.length > 1 ? parts.slice(1).join(".") : "default";

  // Find or create user by address
  let user = await prisma.user.findUnique({
    where: { address },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        address,
        username: address.slice(0, 16),
      },
    });
    console.log(`[ShareParser] Created new user: ${address}`);
  }

  // Find or create worker
  let worker = await prisma.worker.findUnique({
    where: {
      userId_name: {
        userId: user.id,
        name: workerName,
      },
    },
  });

  if (!worker) {
    worker = await prisma.worker.create({
      data: {
        userId: user.id,
        name: workerName,
      },
    });
    console.log(`[ShareParser] Created new worker: ${share.workername}`);
  }

  return { user, worker };
}

/**
 * Process a single sharelog file
 */
async function processSharelogFile(filePath: string): Promise<number> {
  let processedShares = 0;

  try {
    const stat = statSync(filePath);
    const lastPosition = filePositions.get(filePath) ?? 0;

    // File was truncated or rotated
    if (stat.size < lastPosition) {
      console.log(`[ShareParser] File rotated: ${filePath}`);
      filePositions.set(filePath, 0);
    }

    // No new content
    if (stat.size === lastPosition) return 0;

    const stream = createReadStream(filePath, {
      start: lastPosition,
      encoding: "utf8",
    });

    const rl = createInterface({ input: stream });

    for await (const line of rl) {
      if (!line.trim()) continue;

      try {
        const share: CkpoolShare = JSON.parse(line);

        // Skip if missing required fields
        if (!share.username || !share.workername) {
          console.warn(`[ShareParser] Skipping invalid share: missing username/workername`);
          continue;
        }

        // Skip invalid TETSUO addresses (must start with 'T' and be ~34 chars)
        if (!share.username.startsWith("T") || share.username.length < 30) {
          continue;
        }

        const { user, worker } = await getOrCreateWorker(share);
        const submittedAt = parseCreateDate(share.createdate);

        await prisma.share.create({
          data: {
            workerId: worker.id,
            userId: user.id,
            difficulty: BigInt(Math.floor(share.diff)),
            shareDifficulty: BigInt(Math.floor(share.sdiff)),
            isValid: share.result,
            submittedAt,
          },
        });

        // Update worker stats
        const updateData: Record<string, unknown> = {
          lastSeen: submittedAt,
          lastShare: submittedAt,
          isOnline: true,
        };

        if (share.result) {
          updateData.sharesValid = { increment: 1n };
        } else {
          updateData.sharesInvalid = { increment: 1n };
        }

        await prisma.worker.update({
          where: { id: worker.id },
          data: updateData,
        });

        processedShares++;
      } catch (err) {
        if (err instanceof SyntaxError) {
          console.warn(`[ShareParser] Invalid JSON in ${filePath}: ${line.slice(0, 100)}`);
        } else {
          console.error(`[ShareParser] Error processing share: ${err}`);
        }
      }
    }

    filePositions.set(filePath, stat.size);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error(`[ShareParser] Error reading ${filePath}: ${err}`);
    }
  }

  return processedShares;
}

/**
 * Find and process all sharelog files
 */
async function processAllSharelogs(): Promise<number> {
  let totalProcessed = 0;

  if (!existsSync(CKPOOL_LOG_DIR)) {
    console.log(`[ShareParser] Log directory not found: ${CKPOOL_LOG_DIR}`);
    return 0;
  }

  // Scan for block directories (hex names like 000072bf)
  const entries = readdirSync(CKPOOL_LOG_DIR, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (!/^[0-9a-f]+$/i.test(entry.name)) continue;

    const blockDir = join(CKPOOL_LOG_DIR, entry.name);
    const sharelogPath = join(blockDir, ".sharelog");

    // Alternative: sharelog might be named {blockhex}.sharelog
    const altSharelogPath = join(blockDir, `${entry.name}.sharelog`);

    if (existsSync(sharelogPath)) {
      totalProcessed += await processSharelogFile(sharelogPath);
    } else if (existsSync(altSharelogPath)) {
      totalProcessed += await processSharelogFile(altSharelogPath);
    }
  }

  // Also check for sharelog files directly in the log dir
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith(".sharelog")) {
      const sharelogPath = join(CKPOOL_LOG_DIR, entry.name);
      totalProcessed += await processSharelogFile(sharelogPath);
    }
  }

  return totalProcessed;
}

/**
 * Start watching ckpool log directory for shares
 */
export async function startShareParser() {
  console.log(`[ShareParser] Starting, watching: ${CKPOOL_LOG_DIR}`);

  // Initial processing
  const initialProcessed = await processAllSharelogs();
  if (initialProcessed > 0) {
    console.log(`[ShareParser] Initial processing: ${initialProcessed} shares`);
  }

  // Watch for changes in sharelog files
  const watcher = watch(CKPOOL_LOG_DIR, {
    persistent: true,
    usePolling: true,
    interval: 2000,
    depth: 2,
    ignored: (path) => {
      // Only watch .sharelog files
      if (path === CKPOOL_LOG_DIR) return false;
      return !path.endsWith(".sharelog") && !path.includes("/");
    },
  });

  watcher.on("add", async (path) => {
    if (path.endsWith(".sharelog")) {
      console.log(`[ShareParser] New sharelog file: ${path}`);
      const processed = await processSharelogFile(path);
      if (processed > 0) {
        console.log(`[ShareParser] Processed ${processed} shares from ${path}`);
      }
    }
  });

  watcher.on("change", async (path) => {
    if (path.endsWith(".sharelog")) {
      const processed = await processSharelogFile(path);
      if (processed > 0) {
        console.log(`[ShareParser] Processed ${processed} shares from ${path}`);
      }
    }
  });

  watcher.on("error", (error) => {
    console.error(`[ShareParser] Watcher error: ${error}`);
  });

  // Periodic scan to catch any missed files
  setInterval(async () => {
    const processed = await processAllSharelogs();
    if (processed > 0) {
      console.log(`[ShareParser] Periodic scan: ${processed} shares`);
    }
  }, 30000); // Every 30 seconds

  console.log("[ShareParser] Watching for new shares...");
}

// Run if executed directly
if (require.main === module) {
  startShareParser().catch(console.error);
}
