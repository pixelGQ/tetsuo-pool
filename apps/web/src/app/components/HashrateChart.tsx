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
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    // Check theme
    setIsDark(document.documentElement.classList.contains("dark"));

    // Listen for theme changes
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    fetch("/api/pool/hashrate-history")
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    return () => observer.disconnect();
  }, []);

  const colors = {
    stroke: isDark ? "#FFFFFF" : "#000000",
    fill: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
    axis: isDark ? "#A3A3A3" : "#737373",
    tooltipBg: isDark ? "#0F0F0F" : "#FFFFFF",
    tooltipBorder: isDark ? "#FFFFFF" : "#000000",
  };

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center text-[--text-muted] uppercase tracking-wide font-bold">
        Loading...
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-[--text-muted] uppercase tracking-wide font-bold">
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
              <stop offset="5%" stopColor={colors.stroke} stopOpacity={0.2} />
              <stop offset="95%" stopColor={colors.stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="hour"
            stroke={colors.axis}
            fontSize={12}
            tickLine={false}
            axisLine={{ stroke: colors.axis, strokeWidth: 1 }}
            fontWeight={600}
          />
          <YAxis
            stroke={colors.axis}
            fontSize={12}
            tickLine={false}
            axisLine={{ stroke: colors.axis, strokeWidth: 1 }}
            fontWeight={600}
            tickFormatter={(value: number) => {
              if (value >= 1e12) return `${(value / 1e12).toFixed(0)}T`;
              if (value >= 1e9) return `${(value / 1e9).toFixed(0)}G`;
              if (value >= 1e6) return `${(value / 1e6).toFixed(0)}M`;
              return `${value}`;
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: colors.tooltipBg,
              border: `2px solid ${colors.tooltipBorder}`,
              borderRadius: "0",
              fontWeight: 700,
            }}
            labelStyle={{ color: colors.axis, fontWeight: 600 }}
            formatter={(value) => [formatHashrate(value as number), "Hashrate"]}
          />
          <Area
            type="monotone"
            dataKey="hashrate"
            stroke={colors.stroke}
            strokeWidth={2}
            fill="url(#hashrateGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
