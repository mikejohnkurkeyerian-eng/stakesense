"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Row = {
  epoch: number;
  strategy: string;
  yield?: number;
  incidents?: number;
};

const COLORS: Record<string, string> = {
  ours: "#7c3aed",
  baseline: "#10b981",
  random: "#94a3b8",
};

const LABELS: Record<string, string> = {
  ours: "stakesense composite",
  baseline: "Decentralization-only",
  random: "Random",
};

export default function BacktestChart({
  yields,
  dataKey = "yield",
}: {
  yields: Row[];
  dataKey?: "yield" | "incidents";
}) {
  // Pivot rows into wide format keyed by epoch.
  const epochs = Array.from(new Set(yields.map((r) => r.epoch))).sort(
    (a, b) => a - b
  );
  const data = epochs.map((epoch) => {
    const obj: Record<string, number> = { epoch };
    for (const r of yields) {
      if (r.epoch === epoch) {
        const v = (r as Record<string, unknown>)[dataKey];
        if (typeof v === "number") {
          obj[r.strategy] = v;
        }
      }
    }
    return obj;
  });

  const strategies = Array.from(new Set(yields.map((r) => r.strategy)));

  return (
    <div className="border rounded-lg p-4 h-80 bg-white">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="epoch" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend />
          {strategies.map((s) => (
            <Line
              key={s}
              type="monotone"
              dataKey={s}
              name={LABELS[s] ?? s}
              stroke={COLORS[s] ?? "#000"}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
