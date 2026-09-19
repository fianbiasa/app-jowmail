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
      <div className="flex h-[200px] items-center justify-center text-sm font-bold text-muted-foreground">
        Belum ada data aktivitas.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#111111" strokeOpacity={0.15} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fontWeight: 700 }}
          tickFormatter={(v: string) => v.slice(5)}
        />
        <YAxis tick={{ fontSize: 11, fontWeight: 700 }} allowDecimals={false} />
        <Tooltip
          contentStyle={{ border: "3px solid #111111", borderRadius: 0, boxShadow: "5px 5px 0 0 #111111", fontWeight: 700 }}
        />
        <Legend wrapperStyle={{ fontWeight: 900, textTransform: "uppercase", fontSize: 12 }} />
        <Area
          type="monotone"
          dataKey="opens"
          name="Opens"
          stroke="#FF8A00"
          fill="#FF8A00"
          fillOpacity={0.35}
          strokeWidth={3}
        />
        <Area
          type="monotone"
          dataKey="clicks"
          name="Clicks"
          stroke="#A6FF4D"
          fill="#A6FF4D"
          fillOpacity={0.45}
          strokeWidth={3}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
