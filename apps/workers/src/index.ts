import { startShareParser } from "./share-parser";
import { startBlockWatcher } from "./block-watcher";
import { startPplnsCalculator } from "./pplns-calculator";
import { startPayoutWorker } from "./payout-worker";

/**
 * Main worker entry point
 * Starts all background workers
 */
async function main() {
  console.log("=".repeat(60));
  console.log("TETSUO Mining Pool - Background Workers");
  console.log("=".repeat(60));

  // Determine which workers to run based on command line args
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--all")) {
    console.log("Starting all workers...\n");

    await Promise.all([
      startShareParser(),
      startBlockWatcher(),
      startPplnsCalculator(),
      startPayoutWorker(),
    ]);
  } else {
    if (args.includes("--share-parser")) {
      await startShareParser();
    }
    if (args.includes("--block-watcher")) {
      await startBlockWatcher();
    }
    if (args.includes("--pplns")) {
      await startPplnsCalculator();
    }
    if (args.includes("--payout")) {
      await startPayoutWorker();
    }
  }

  console.log("\nAll workers started. Press Ctrl+C to stop.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
