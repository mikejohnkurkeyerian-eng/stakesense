"use client";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type EpochPerf = {
  epoch: number;
  skip_rate: number | null;
  vote_latency: number | null;
  credits: number | null;
};

export default function HistoryCharts({ history }: { history: EpochPerf[] }) {
  const data = [...history]
    .sort((a, b) => a.epoch - b.epoch)
    .map((h) => ({
      epoch: h.epoch,
      skip_rate_pct: h.skip_rate == null ? null : h.skip_rate * 100,
      credits: h.credits,
      vote_latency: h.vote_latency,
    }));

  const hasSkip = data.some((d) => d.skip_rate_pct != null);
  const hasCredits = data.some((d) => d.credits != null);

  if (!hasSkip && !hasCredits) {
    return (
      <div className="border rounded-lg p-6 text-sm text-slate-500 text-center">
        Not enough history yet for charts. Daily refresh adds 1 epoch per run.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {hasSkip && (
        <div className="border rounded-lg p-4 h-72">
          <div className="text-sm font-medium mb-2">Skip rate (%)</div>
          <ResponsiveContainer width="100%" height="90%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="epoch" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="skip_rate_pct"
                stroke="#7c3aed"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      {hasCredits && (
        <div className="border rounded-lg p-4 h-72">
          <div className="text-sm font-medium mb-2">Credits per epoch</div>
          <ResponsiveContainer width="100%" height="90%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="epoch" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="credits"
                stroke="#2563eb"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
