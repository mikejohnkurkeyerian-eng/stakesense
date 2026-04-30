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

import type { PredictionPoint } from "@/lib/api";

export default function PredictionHistoryChart({
  history,
}: {
  history: PredictionPoint[];
}) {
  if (history.length < 2) {
    return (
      <div className="border rounded-lg p-6 text-sm text-slate-500 text-center">
        Score history populates as the cron runs. Check back tomorrow for a
        trend line.
      </div>
    );
  }

  // Recharts wants ascending dates and numeric percentages.
  const data = [...history]
    .sort((a, b) => a.prediction_date.localeCompare(b.prediction_date))
    .map((p) => ({
      date: p.prediction_date,
      composite: p.composite_score,
      downtime_pct:
        p.downtime_prob_7d == null ? null : p.downtime_prob_7d * 100,
      mev_tax_pct: p.mev_tax_rate == null ? null : p.mev_tax_rate * 100,
      decentralization: p.decentralization_score,
    }));

  return (
    <div className="border rounded-lg p-4 h-72 bg-white">
      <div className="text-sm font-medium mb-2">
        Score history ({history.length} day{history.length === 1 ? "" : "s"})
      </div>
      <ResponsiveContainer width="100%" height="90%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} domain={[0, 1]} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line
            type="monotone"
            dataKey="composite"
            name="Composite"
            stroke="#0f172a"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="decentralization"
            name="Decentralization"
            stroke="#10b981"
            strokeWidth={1.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
