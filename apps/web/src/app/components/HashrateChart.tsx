"use client";

import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DataPoint {
  hour: string;
  hashrate: number;
  shares: number;
}

function formatHashrate(hashrate: number): string {
  if (hashrate >= 1e15) return `${(hashrate / 1e15).toFixed(2)} PH/s`;
  if (hashrate >= 1e12) return `${(hashrate / 1e12).toFixed(2)} TH/s`;
  if (hashrate >= 1e9) return `${(hashrate / 1e9).toFixed(2)} GH/s`;
  if (hashrate >= 1e6) return `${(hashrate / 1e6).toFixed(2)} MH/s`;
  if (hashrate >= 1e3) return `${(hashrate / 1e3).toFixed(2)} KH/s`;
  return `${hashrate.toFixed(2)} H/s`;
}

export function HashrateChart() {
  const [data, setData] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/pool/hashrate-history")
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-400">
        Loading...
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-400">
        No data available
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="hashrateGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="hour"
            stroke="#6b7280"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#6b7280"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value: number) => {
              if (value >= 1e12) return `${(value / 1e12).toFixed(0)}T`;
              if (value >= 1e9) return `${(value / 1e9).toFixed(0)}G`;
              if (value >= 1e6) return `${(value / 1e6).toFixed(0)}M`;
              return `${value}`;
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1f2937",
              border: "1px solid #374151",
              borderRadius: "8px",
            }}
            labelStyle={{ color: "#9ca3af" }}
            formatter={(value) => [formatHashrate(value as number), "Hashrate"]}
          />
          <Area
            type="monotone"
            dataKey="hashrate"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#hashrateGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
