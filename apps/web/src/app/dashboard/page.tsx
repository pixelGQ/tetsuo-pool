"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

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

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [address, setAddress] = useState("");
  const [stats, setStats] = useState<MinerStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const lookupMiner = useCallback(async (addr: string) => {
    if (!addr.trim()) return;

    setLoading(true);
    setError("");
    setStats(null);

    try {
      const res = await fetch(`/api/miner/${addr}`);
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
      // Update URL with address
      router.push(`/dashboard?address=${addr}`, { scroll: false });
    } catch (err) {
      setError("Failed to fetch miner stats");
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Auto-load miner from URL parameter
  useEffect(() => {
    const urlAddress = searchParams.get("address");
    if (urlAddress && urlAddress !== address) {
      setAddress(urlAddress);
      lookupMiner(urlAddress);
    }
  }, [searchParams]);

  return (
    <div className="space-y-4 md:space-y-6">
      <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight">Miner Dashboard</h1>

      {/* Address Lookup */}
      <div className="manga-card p-4 md:p-6">
        <div className="flex flex-col md:flex-row gap-3 md:gap-4">
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter your TETSUO address"
            className="flex-1 px-3 md:px-4 py-2 bg-[--bg-secondary] border-2 border-[--border] focus:outline-none text-sm md:text-base font-bold"
            onKeyDown={(e) => e.key === "Enter" && lookupMiner(address)}
          />
          <button
            onClick={() => lookupMiner(address)}
            disabled={loading}
            className="manga-btn px-4 md:px-6 py-2 disabled:opacity-50 text-sm md:text-base"
          >
            {loading ? "Loading..." : "Lookup"}
          </button>
        </div>
        {error && <p className="mt-2 text-[--text-muted] text-sm font-bold">{error}</p>}
      </div>

      {/* Miner Stats */}
      {stats && (
        <>
          {/* Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <div className="manga-card p-4 md:p-6">
              <div className="text-[--text-muted] text-xs md:text-sm uppercase tracking-wide">Your Hashrate</div>
              <div className="stat-number mt-1">{formatHashrate(stats.hashrate)}</div>
            </div>
            <div className="manga-card p-4 md:p-6">
              <div className="text-[--text-muted] text-xs md:text-sm uppercase tracking-wide">Pending</div>
              <div className="stat-number mt-1">{formatTetsuo(stats.pendingBalance)}</div>
            </div>
            <div className="manga-card p-4 md:p-6">
              <div className="text-[--text-muted] text-xs md:text-sm uppercase tracking-wide">Total Paid</div>
              <div className="stat-number mt-1">{formatTetsuo(stats.paidBalance)}</div>
            </div>
            <div className="manga-card p-4 md:p-6">
              <div className="text-[--text-muted] text-xs md:text-sm uppercase tracking-wide">Blocks Found</div>
              <div className="stat-number mt-1">{stats.blocksFound}</div>
            </div>
          </div>

          {/* Workers */}
          <div className="manga-card p-4 md:p-6">
            <h2 className="text-lg md:text-xl font-black uppercase tracking-wide mb-3 md:mb-4">Your Workers</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs md:text-sm manga-table">
                <thead>
                  <tr>
                    <th className="text-left py-2 px-3">Worker</th>
                    <th className="text-left py-2 px-3">Status</th>
                    <th className="text-left py-2 px-3 hidden md:table-cell">Last Seen</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.workers.map((worker) => (
                    <tr key={worker.name}>
                      <td className="py-2 px-3 font-bold">{worker.name}</td>
                      <td className="py-2 px-3">
                        <span
                          className={`px-2 py-1 text-xs font-bold uppercase ${
                            worker.isOnline
                              ? "badge-confirmed"
                              : "badge-orphaned"
                          }`}
                        >
                          {worker.isOnline ? "Online" : "Offline"}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-[--text-muted] hidden md:table-cell">
                        {new Date(worker.lastSeen).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {stats.workers.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-4 text-center text-[--text-muted] uppercase font-bold">
                        No workers connected
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Payouts */}
          <div className="manga-card p-4 md:p-6">
            <h2 className="text-lg md:text-xl font-black uppercase tracking-wide mb-3 md:mb-4">Recent Payouts</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs md:text-sm manga-table">
                <thead>
                  <tr>
                    <th className="text-left py-2 px-3">Amount</th>
                    <th className="text-left py-2 px-3 hidden md:table-cell">TX ID</th>
                    <th className="text-left py-2 px-3">Status</th>
                    <th className="text-left py-2 px-3 hidden md:table-cell">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentPayouts.map((payout, i) => (
                    <tr key={i}>
                      <td className="py-2 px-3 font-bold">{formatTetsuo(payout.amount)}</td>
                      <td className="py-2 px-3 font-mono text-xs hidden md:table-cell">
                        {payout.txid ? `${payout.txid.slice(0, 12)}...` : "-"}
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={`px-2 py-1 text-xs font-bold uppercase ${
                            payout.status === "CONFIRMED"
                              ? "badge-confirmed"
                              : payout.status === "SENT"
                              ? "badge-pending"
                              : payout.status === "PENDING"
                              ? "badge-pending"
                              : "badge-orphaned"
                          }`}
                        >
                          {payout.status}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-[--text-muted] hidden md:table-cell">
                        {new Date(payout.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {stats.recentPayouts.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-[--text-muted] uppercase font-bold">
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

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="text-center py-8">Loading...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
