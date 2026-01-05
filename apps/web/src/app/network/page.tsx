"use client";

import { useEffect, useState } from "react";

interface NetworkStats {
  blockHeight: number;
  difficulty: number;
  networkHashrate: number;
  blockReward: number;
  chain: string;
  syncing: boolean;
  headers: number;
}

function formatHashrate(h: number): string {
  if (h >= 1e18) return `${(h / 1e18).toFixed(2)} EH/s`;
  if (h >= 1e15) return `${(h / 1e15).toFixed(2)} PH/s`;
  if (h >= 1e12) return `${(h / 1e12).toFixed(2)} TH/s`;
  if (h >= 1e9) return `${(h / 1e9).toFixed(2)} GH/s`;
  if (h >= 1e6) return `${(h / 1e6).toFixed(2)} MH/s`;
  if (h >= 1e3) return `${(h / 1e3).toFixed(2)} KH/s`;
  return `${h.toFixed(2)} H/s`;
}

function formatDifficulty(d: number): string {
  if (d >= 1e12) return `${(d / 1e12).toFixed(2)} T`;
  if (d >= 1e9) return `${(d / 1e9).toFixed(2)} G`;
  if (d >= 1e6) return `${(d / 1e6).toFixed(2)} M`;
  if (d >= 1e3) return `${(d / 1e3).toFixed(2)} K`;
  return d.toFixed(2);
}

function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

export default function NetworkPage() {
  const [stats, setStats] = useState<NetworkStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/network");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch");
      }
      const data = await res.json();
      setStats(data);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch network stats");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-[--text-muted] uppercase tracking-wide font-bold">Loading network stats...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight">TETSUO Network</h1>
        <div className="manga-card p-4 md:p-6">
          <p className="text-[--text-muted] font-bold">{error}</p>
          <button
            onClick={() => { setLoading(true); fetchStats(); }}
            className="mt-4 px-4 py-2 border-2 border-[--border] bg-[--bg-secondary] font-bold uppercase hover:bg-[--accent] hover:text-[--bg-primary] transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-2">
        <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight">TETSUO Network</h1>
        {stats?.syncing && (
          <span className="px-3 py-1 border-2 border-[--border] bg-[--bg-secondary] text-[--text-muted] text-sm font-bold uppercase w-fit">
            Syncing...
          </span>
        )}
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="manga-card p-4 md:p-6">
          <div className="text-[--text-muted] text-xs md:text-sm uppercase tracking-wide">Block Height</div>
          <div className="stat-number mt-1">
            {formatNumber(stats?.blockHeight ?? 0)}
          </div>
        </div>

        <div className="manga-card p-4 md:p-6">
          <div className="text-[--text-muted] text-xs md:text-sm uppercase tracking-wide">Difficulty</div>
          <div className="stat-number mt-1">
            {formatDifficulty(stats?.difficulty ?? 0)}
          </div>
        </div>

        <div className="manga-card p-4 md:p-6">
          <div className="text-[--text-muted] text-xs md:text-sm uppercase tracking-wide">Net Hashrate</div>
          <div className="stat-number mt-1">
            {formatHashrate(stats?.networkHashrate ?? 0)}
          </div>
        </div>

        <div className="manga-card p-4 md:p-6">
          <div className="text-[--text-muted] text-xs md:text-sm uppercase tracking-wide">Block Reward</div>
          <div className="stat-number mt-1">
            {formatNumber(stats?.blockReward ?? 0)}
          </div>
          <div className="text-xs text-[--text-muted]">TETSUO</div>
        </div>
      </div>

      {/* Additional Info */}
      <div className="manga-card p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-black uppercase tracking-wide mb-3 md:mb-4">Network Information</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 text-xs md:text-sm">
          <div className="flex justify-between border-b border-[--border-light] pb-2">
            <span className="text-[--text-muted] uppercase">Chain</span>
            <span className="font-bold capitalize">{stats?.chain ?? "main"}</span>
          </div>
          <div className="flex justify-between border-b border-[--border-light] pb-2">
            <span className="text-[--text-muted] uppercase">Block Time</span>
            <span className="font-bold">60 sec</span>
          </div>
          <div className="flex justify-between border-b border-[--border-light] pb-2">
            <span className="text-[--text-muted] uppercase">Algorithm</span>
            <span className="font-bold">SHA-256</span>
          </div>
          <div className="flex justify-between border-b border-[--border-light] pb-2">
            <span className="text-[--text-muted] uppercase">Headers</span>
            <span className="font-bold">{formatNumber(stats?.headers ?? 0)}</span>
          </div>
          <div className="flex justify-between border-b border-[--border-light] pb-2">
            <span className="text-[--text-muted] uppercase">Status</span>
            <span className="font-bold">
              {stats?.syncing ? "Syncing" : "Synced"}
            </span>
          </div>
          <div className="flex justify-between border-b border-[--border-light] pb-2">
            <span className="text-[--text-muted] uppercase">Daily</span>
            <span className="font-bold">~1,440 blk</span>
          </div>
        </div>
      </div>

      {/* Estimated Earnings Calculator */}
      <div className="manga-card p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-black uppercase tracking-wide mb-3 md:mb-4">Earnings Calculator</h2>
        <p className="text-[--text-muted] text-xs md:text-sm mb-3 md:mb-4">
          Estimate your daily earnings based on your hashrate
        </p>
        <EarningsCalculator
          networkHashrate={stats?.networkHashrate ?? 0}
          blockReward={stats?.blockReward ?? 10000}
        />
      </div>
    </div>
  );
}

function EarningsCalculator({
  networkHashrate,
  blockReward,
}: {
  networkHashrate: number;
  blockReward: number;
}) {
  const [hashrate, setHashrate] = useState("");
  const [unit, setUnit] = useState("TH/s");

  const multipliers: Record<string, number> = {
    "H/s": 1,
    "KH/s": 1e3,
    "MH/s": 1e6,
    "GH/s": 1e9,
    "TH/s": 1e12,
    "PH/s": 1e15,
  };

  const userHashrate = parseFloat(hashrate || "0") * multipliers[unit];
  const blocksPerDay = 1440;
  const dailyReward = networkHashrate > 0
    ? (userHashrate / networkHashrate) * blocksPerDay * blockReward
    : 0;

  return (
    <div className="space-y-3 md:space-y-4">
      <div className="flex flex-col md:flex-row gap-2">
        <input
          type="number"
          value={hashrate}
          onChange={(e) => setHashrate(e.target.value)}
          placeholder="Enter your hashrate"
          className="flex-1 px-3 md:px-4 py-2 bg-[--bg-secondary] border-2 border-[--border] focus:outline-none text-sm md:text-base font-bold"
        />
        <select
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          className="px-3 md:px-4 py-2 bg-[--bg-secondary] border-2 border-[--border] focus:outline-none text-sm md:text-base font-bold"
        >
          {Object.keys(multipliers).map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>
      </div>

      {userHashrate > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
          <div className="border-2 border-[--border] p-3 md:p-4 bg-[--bg-secondary]">
            <div className="text-[--text-muted] text-xs uppercase">Daily</div>
            <div className="text-sm md:text-lg font-black">
              {dailyReward.toFixed(0)}
            </div>
          </div>
          <div className="border-2 border-[--border] p-3 md:p-4 bg-[--bg-secondary]">
            <div className="text-[--text-muted] text-xs uppercase">Weekly</div>
            <div className="text-sm md:text-lg font-black">
              {(dailyReward * 7).toFixed(0)}
            </div>
          </div>
          <div className="border-2 border-[--border] p-3 md:p-4 bg-[--bg-secondary]">
            <div className="text-[--text-muted] text-xs uppercase">Monthly</div>
            <div className="text-sm md:text-lg font-black">
              {(dailyReward * 30).toFixed(0)}
            </div>
          </div>
          <div className="border-2 border-[--border] p-3 md:p-4 bg-[--bg-secondary]">
            <div className="text-[--text-muted] text-xs uppercase">Net Share</div>
            <div className="text-sm md:text-lg font-black">
              {((userHashrate / networkHashrate) * 100).toFixed(4)}%
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
