// Pool configuration from environment
export const POOL_CONFIG = {
  // Fee percentage (0-100)
  feePercent: parseFloat(process.env.POOL_FEE_PERCENT ?? "10"),

  // PPLNS window in minutes
  pplnsWindowMinutes: parseInt(process.env.PPLNS_WINDOW_MINUTES ?? "120"),

  // Minimum payout threshold (in TETSUO)
  minPayoutThreshold: parseFloat(process.env.MIN_PAYOUT_THRESHOLD ?? "100"),

  // Block maturity confirmations
  blockMaturityConfirmations: parseInt(process.env.BLOCK_MATURITY_CONFIRMATIONS ?? "100"),

  // Block reward (in TETSUO)
  blockReward: 10000,

  // Block time in seconds
  blockTime: 60,
} as const;

// Convert TETSUO to satoshis (smallest unit)
// 1 TETSUO = 100,000,000 satoshis
export const SATOSHIS_PER_TETSUO = 100_000_000n;

export function tetsuoToSatoshis(tetsuo: number): bigint {
  return BigInt(Math.floor(tetsuo * 100_000_000));
}

export function satoshisToTetsuo(satoshis: bigint): number {
  return Number(satoshis) / 100_000_000;
}

// Format hashrate for display
export function formatHashrate(hashrate: bigint | number): string {
  const h = typeof hashrate === "bigint" ? Number(hashrate) : hashrate;

  if (h >= 1e18) return `${(h / 1e18).toFixed(2)} EH/s`;
  if (h >= 1e15) return `${(h / 1e15).toFixed(2)} PH/s`;
  if (h >= 1e12) return `${(h / 1e12).toFixed(2)} TH/s`;
  if (h >= 1e9) return `${(h / 1e9).toFixed(2)} GH/s`;
  if (h >= 1e6) return `${(h / 1e6).toFixed(2)} MH/s`;
  if (h >= 1e3) return `${(h / 1e3).toFixed(2)} KH/s`;
  return `${h.toFixed(2)} H/s`;
}

// Format TETSUO amount for display
export function formatTetsuo(satoshis: bigint | number, decimals = 8): string {
  const tetsuo = satoshisToTetsuo(typeof satoshis === "number" ? BigInt(satoshis) : satoshis);
  return tetsuo.toFixed(decimals);
}

// Calculate share difficulty from target
export function difficultyFromTarget(target: string): number {
  // Bitcoin difficulty calculation
  const maxTarget = BigInt("0x00000000FFFF0000000000000000000000000000000000000000000000000000");
  const currentTarget = BigInt("0x" + target);
  return Number(maxTarget) / Number(currentTarget);
}

// Parse ckpool log timestamp
export function parseCkpoolTimestamp(timestamp: string): Date {
  // Format: [YYYY-MM-DD HH:MM:SS.mmm]
  const match = timestamp.match(/\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3})\]/);
  if (match) {
    return new Date(match[1].replace(" ", "T") + "Z");
  }
  return new Date();
}
