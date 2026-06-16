"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface DailyStat {
  date: string;
  opens: number;
  clicks: number;
}

export function CampaignChart({ data }: { data: DailyStat[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-slate-500">
        Belum ada data aktivitas.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11 }}
          tickFormatter={(v: string) => v.slice(5)}
        />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
        <Tooltip />
        <Legend />
        <Area
          type="monotone"
          dataKey="opens"
          name="Opens"
          stroke="#6366f1"
          fill="#e0e7ff"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="clicks"
          name="Clicks"
          stroke="#10b981"
          fill="#d1fae5"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
