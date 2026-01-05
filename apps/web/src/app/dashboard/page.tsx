"use client";

import { useState } from "react";

interface MinerStats {
  address: string;
  pendingBalance: string;
  paidBalance: string;
  totalShares: number;
  blocksFound: number;
  hashrate: number;
  sharesLastHour: number;
  workers: { name: string; isOnline: boolean; lastSeen: string }[];
  recentPayouts: { amount: string; txid: string | null; status: string; createdAt: string }[];
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

function formatTetsuo(satoshis: string): string {
  return (Number(satoshis) / 100_000_000).toFixed(8);
}

export default function DashboardPage() {
  const [address, setAddress] = useState("");
  const [stats, setStats] = useState<MinerStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const lookupMiner = async () => {
    if (!address.trim()) return;

    setLoading(true);
    setError("");
    setStats(null);

    try {
      const res = await fetch(`/api/miner/${address}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError("Miner not found. Start mining to see your stats here!");
        } else {
          setError("Failed to fetch miner stats");
        }
        return;
      }
      const data = await res.json();
      setStats(data);
    } catch (err) {
      setError("Failed to fetch miner stats");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold">Miner Dashboard</h1>

      {/* Address Lookup */}
      <div className="bg-gray-800 rounded-lg p-4 md:p-6">
        <div className="flex flex-col md:flex-row gap-3 md:gap-4">
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter your TETSUO address"
            className="flex-1 px-3 md:px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 text-sm md:text-base"
            onKeyDown={(e) => e.key === "Enter" && lookupMiner()}
          />
          <button
            onClick={lookupMiner}
            disabled={loading}
            className="px-4 md:px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 text-sm md:text-base"
          >
            {loading ? "Loading..." : "Lookup"}
          </button>
        </div>
        {error && <p className="mt-2 text-red-400 text-sm">{error}</p>}
      </div>

      {/* Miner Stats */}
      {stats && (
        <>
          {/* Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <div className="bg-gray-800 rounded-lg p-4 md:p-6">
              <div className="text-gray-400 text-xs md:text-sm">Your Hashrate</div>
              <div className="text-lg md:text-2xl font-bold">{formatHashrate(stats.hashrate)}</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 md:p-6">
              <div className="text-gray-400 text-xs md:text-sm">Pending</div>
              <div className="text-lg md:text-2xl font-bold">{formatTetsuo(stats.pendingBalance)}</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 md:p-6">
              <div className="text-gray-400 text-xs md:text-sm">Total Paid</div>
              <div className="text-lg md:text-2xl font-bold">{formatTetsuo(stats.paidBalance)}</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 md:p-6">
              <div className="text-gray-400 text-xs md:text-sm">Blocks Found</div>
              <div className="text-lg md:text-2xl font-bold">{stats.blocksFound}</div>
            </div>
          </div>

          {/* Workers */}
          <div className="bg-gray-800 rounded-lg p-4 md:p-6">
            <h2 className="text-lg md:text-xl font-bold mb-3 md:mb-4">Your Workers</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs md:text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-700">
                    <th className="text-left py-2">Worker</th>
                    <th className="text-left py-2">Status</th>
                    <th className="text-left py-2 hidden md:table-cell">Last Seen</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.workers.map((worker) => (
                    <tr key={worker.name} className="border-b border-gray-700/50">
                      <td className="py-2">{worker.name}</td>
                      <td className="py-2">
                        <span
                          className={`px-1.5 md:px-2 py-0.5 md:py-1 rounded text-xs ${
                            worker.isOnline
                              ? "bg-green-900 text-green-300"
                              : "bg-gray-700 text-gray-400"
                          }`}
                        >
                          {worker.isOnline ? "Online" : "Offline"}
                        </span>
                      </td>
                      <td className="py-2 text-gray-400 hidden md:table-cell">
                        {new Date(worker.lastSeen).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {stats.workers.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-4 text-center text-gray-400">
                        No workers connected
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Payouts */}
          <div className="bg-gray-800 rounded-lg p-4 md:p-6">
            <h2 className="text-lg md:text-xl font-bold mb-3 md:mb-4">Recent Payouts</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs md:text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-700">
                    <th className="text-left py-2">Amount</th>
                    <th className="text-left py-2 hidden md:table-cell">TX ID</th>
                    <th className="text-left py-2">Status</th>
                    <th className="text-left py-2 hidden md:table-cell">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentPayouts.map((payout, i) => (
                    <tr key={i} className="border-b border-gray-700/50">
                      <td className="py-2">{formatTetsuo(payout.amount)}</td>
                      <td className="py-2 font-mono text-xs hidden md:table-cell">
                        {payout.txid ? `${payout.txid.slice(0, 12)}...` : "-"}
                      </td>
                      <td className="py-2">
                        <span
                          className={`px-1.5 md:px-2 py-0.5 md:py-1 rounded text-xs ${
                            payout.status === "CONFIRMED"
                              ? "bg-green-900 text-green-300"
                              : payout.status === "SENT"
                              ? "bg-blue-900 text-blue-300"
                              : payout.status === "PENDING"
                              ? "bg-yellow-900 text-yellow-300"
                              : "bg-red-900 text-red-300"
                          }`}
                        >
                          {payout.status}
                        </span>
                      </td>
                      <td className="py-2 text-gray-400 hidden md:table-cell">
                        {new Date(payout.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {stats.recentPayouts.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-gray-400">
                        No payouts yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
