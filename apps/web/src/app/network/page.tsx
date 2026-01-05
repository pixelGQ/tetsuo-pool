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
    const interval = setInterval(fetchStats, 5000); // Update every 5s
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-400">Loading network stats...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">TETSUO Network</h1>
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-6">
          <p className="text-red-400">{error}</p>
          <button
            onClick={() => { setLoading(true); fetchStats(); }}
            className="mt-4 px-4 py-2 bg-red-700 hover:bg-red-600 rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">TETSUO Network</h1>
        {stats?.syncing && (
          <span className="px-3 py-1 bg-yellow-900 text-yellow-300 rounded text-sm">
            Syncing...
          </span>
        )}
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="text-gray-400 text-sm mb-1">Block Height</div>
          <div className="text-3xl font-bold text-blue-400">
            {formatNumber(stats?.blockHeight ?? 0)}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="text-gray-400 text-sm mb-1">Difficulty</div>
          <div className="text-3xl font-bold text-purple-400">
            {formatDifficulty(stats?.difficulty ?? 0)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {stats?.difficulty.toLocaleString("en-US", { maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="text-gray-400 text-sm mb-1">Network Hashrate</div>
          <div className="text-3xl font-bold text-green-400">
            {formatHashrate(stats?.networkHashrate ?? 0)}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="text-gray-400 text-sm mb-1">Block Reward</div>
          <div className="text-3xl font-bold text-yellow-400">
            {formatNumber(stats?.blockReward ?? 0)}
          </div>
          <div className="text-xs text-gray-500 mt-1">TETSUO</div>
        </div>
      </div>

      {/* Additional Info */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">Network Information</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Chain:</span>
            <span className="ml-2 capitalize">{stats?.chain ?? "main"}</span>
          </div>
          <div>
            <span className="text-gray-400">Block Time:</span>
            <span className="ml-2">60 seconds</span>
          </div>
          <div>
            <span className="text-gray-400">Algorithm:</span>
            <span className="ml-2">SHA-256</span>
          </div>
          <div>
            <span className="text-gray-400">Headers:</span>
            <span className="ml-2">{formatNumber(stats?.headers ?? 0)}</span>
          </div>
          <div>
            <span className="text-gray-400">Sync Status:</span>
            <span className={`ml-2 ${stats?.syncing ? "text-yellow-400" : "text-green-400"}`}>
              {stats?.syncing ? "Syncing" : "Synced"}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Daily Blocks:</span>
            <span className="ml-2">~1,440</span>
          </div>
        </div>
      </div>

      {/* Estimated Earnings Calculator */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">Earnings Calculator</h2>
        <p className="text-gray-400 text-sm mb-4">
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
  const blocksPerDay = 1440; // 60 sec blocks = 1440 blocks/day
  const dailyReward = networkHashrate > 0
    ? (userHashrate / networkHashrate) * blocksPerDay * blockReward
    : 0;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="number"
          value={hashrate}
          onChange={(e) => setHashrate(e.target.value)}
          placeholder="Enter your hashrate"
          className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
        />
        <select
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
        >
          {Object.keys(multipliers).map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>
      </div>

      {userHashrate > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-700 rounded p-4">
            <div className="text-gray-400 text-xs">Daily (est.)</div>
            <div className="text-lg font-bold text-green-400">
              {dailyReward.toFixed(2)} TETSUO
            </div>
          </div>
          <div className="bg-gray-700 rounded p-4">
            <div className="text-gray-400 text-xs">Weekly (est.)</div>
            <div className="text-lg font-bold text-green-400">
              {(dailyReward * 7).toFixed(2)} TETSUO
            </div>
          </div>
          <div className="bg-gray-700 rounded p-4">
            <div className="text-gray-400 text-xs">Monthly (est.)</div>
            <div className="text-lg font-bold text-green-400">
              {(dailyReward * 30).toFixed(2)} TETSUO
            </div>
          </div>
          <div className="bg-gray-700 rounded p-4">
            <div className="text-gray-400 text-xs">Network Share</div>
            <div className="text-lg font-bold text-blue-400">
              {((userHashrate / networkHashrate) * 100).toFixed(6)}%
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
