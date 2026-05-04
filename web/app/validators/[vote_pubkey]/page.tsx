import Link from "next/link";

import HistoryCharts from "@/components/HistoryCharts";
import PredictionHistoryChart from "@/components/PredictionHistoryChart";
import { getPredictionHistory, getValidator } from "@/lib/api";

function shortPk(pk: string) {
  return `${pk.slice(0, 4)}…${pk.slice(-4)}`;
}

function ScoreBreakdown({
  downtime,
  mev_tax,
  decentralization,
  composite,
}: {
  downtime: number | null;
  mev_tax: number | null;
  decentralization: number | null;
  composite: number;
}) {
  const downtimeContrib = downtime != null ? 0.5 * (1 - downtime) : null;
  const mevContrib = mev_tax != null ? 0.3 * (1 - mev_tax) : null;
  const decContrib = decentralization != null ? 0.2 * decentralization : null;
  const max = composite || 0.001;
  return (
    <div className="space-y-3">
      <BreakdownRow
        label="Downtime pillar (50% weight)"
        formula={
          downtime != null
            ? `0.5 × (1 − ${(downtime * 100).toFixed(1)}%) = ${
                downtimeContrib != null ? (downtimeContrib * 100).toFixed(1) + "%" : "—"
              }`
            : "—"
        }
        value={downtimeContrib}
        max={max}
        color="bg-violet-500"
      />
      <BreakdownRow
        label="MEV-tax pillar (30% weight)"
        formula={
          mev_tax != null
            ? `0.3 × (1 − ${(mev_tax * 100).toFixed(1)}%) = ${
                mevContrib != null ? (mevContrib * 100).toFixed(1) + "%" : "—"
              }`
            : "—"
        }
        value={mevContrib}
        max={max}
        color="bg-blue-500"
      />
      <BreakdownRow
        label="Decentralization pillar (20% weight)"
        formula={
          decentralization != null
            ? `0.2 × ${(decentralization * 100).toFixed(1)}% = ${
                decContrib != null ? (decContrib * 100).toFixed(1) + "%" : "—"
              }`
            : "—"
        }
        value={decContrib}
        max={max}
        color="bg-emerald-500"
      />
    </div>
  );
}

function BreakdownRow({
  label,
  formula,
  value,
  max,
  color,
}: {
  label: string;
  formula: string;
  value: number | null;
  max: number;
  color: string;
}) {
  const pct = value != null && max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-slate-700">{label}</span>
        <span className="text-slate-500 font-mono text-xs">{formula}</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default async function Page({
  params,
}: {
  params: Promise<{ vote_pubkey: string }>;
}) {
  const p = await params;
  const [data, predHistory] = await Promise.all([
    getValidator(p.vote_pubkey),
    getPredictionHistory(p.vote_pubkey, 30).catch(() => null),
  ]);
  const v = data.validator;

  return (
    <main className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <Link
          href="/validators"
          className="text-sm text-slate-500 hover:text-slate-900"
        >
          ← All validators
        </Link>
        <div className="flex gap-2">
          <Link
            href={`/operator/${p.vote_pubkey}`}
            className="text-sm px-3 py-1.5 border border-emerald-300 bg-emerald-50 text-emerald-900 rounded-lg hover:bg-emerald-100"
          >
            Operator view
          </Link>
          <Link
            href={`/compare?vs=${p.vote_pubkey}`}
            className="text-sm px-3 py-1.5 border rounded-lg hover:bg-slate-50"
          >
            Compare with another
          </Link>
        </div>
      </div>
      <h1 className="text-3xl font-semibold mb-1">
        {v.name ?? shortPk(v.vote_pubkey)}
      </h1>
      <p className="text-slate-500 mb-6 break-all font-mono text-sm">
        {v.vote_pubkey}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="border rounded-lg p-5 bg-white">
          <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">
            Downtime risk (7d)
          </div>
          <div className="text-3xl font-bold text-violet-600">
            {((v.downtime_prob_7d ?? 0) * 100).toFixed(1)}%
          </div>
        </div>
        <div className="border rounded-lg p-5 bg-white">
          <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">
            MEV tax
          </div>
          <div className="text-3xl font-bold text-blue-600">
            {((v.mev_tax_rate ?? 0) * 100).toFixed(1)}%
          </div>
        </div>
        <div className="border rounded-lg p-5 bg-white">
          <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">
            Decentralization
          </div>
          <div className="text-3xl font-bold text-emerald-600">
            {(v.decentralization_score ?? 0).toFixed(3)}
          </div>
        </div>
      </div>

      {v.composite_score != null && (
        <section className="mb-8 border rounded-lg p-5 bg-white">
          <h2 className="text-xl font-semibold mb-2">
            Composite score breakdown
          </h2>
          <p className="text-sm text-slate-600 mb-4">
            How this validator&apos;s composite of{" "}
            <span className="font-bold text-slate-900">
              {(v.composite_score * 100).toFixed(1)}%
            </span>{" "}
            decomposes:
          </p>
          <ScoreBreakdown
            downtime={v.downtime_prob_7d}
            mev_tax={v.mev_tax_rate}
            decentralization={v.decentralization_score}
            composite={v.composite_score}
          />
          <p className="text-xs text-slate-500 mt-4">
            Formula:{" "}
            <code className="bg-slate-100 px-1.5 py-0.5 rounded">
              0.5·(1−downtime) + 0.3·(1−mev_tax) + 0.2·decentralization
            </code>
            . Read the{" "}
            <Link href="/methodology" className="text-violet-700 underline">
              methodology
            </Link>{" "}
            for the why behind each weight.
          </p>
        </section>
      )}

      {predHistory && (
        <>
          <h2 className="text-xl font-semibold mb-4">Score history</h2>
          <div className="mb-8">
            <PredictionHistoryChart history={predHistory.history} />
          </div>
        </>
      )}

      <h2 className="text-xl font-semibold mb-4">Recent epochs</h2>
      <div className="mb-8">
        <HistoryCharts history={data.history} />
      </div>

      <h2 className="text-xl font-semibold mb-2">Per-epoch detail</h2>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="text-left p-3">Epoch</th>
              <th className="text-right p-3">Skip rate</th>
              <th className="text-right p-3">Vote latency</th>
              <th className="text-right p-3">Credits</th>
              <th className="text-right p-3">Stake (lamports)</th>
              <th className="text-right p-3">Delinquent</th>
            </tr>
          </thead>
          <tbody>
            {data.history.map((h) => (
              <tr key={h.epoch} className="border-t">
                <td className="p-3 font-mono">{h.epoch}</td>
                <td className="p-3 text-right font-mono">
                  {h.skip_rate == null
                    ? "—"
                    : `${(h.skip_rate * 100).toFixed(2)}%`}
                </td>
                <td className="p-3 text-right font-mono">
                  {h.vote_latency == null ? "—" : h.vote_latency.toFixed(2)}
                </td>
                <td className="p-3 text-right font-mono">
                  {h.credits?.toLocaleString() ?? "—"}
                </td>
                <td className="p-3 text-right font-mono">
                  {h.active_stake?.toLocaleString() ?? "—"}
                </td>
                <td className="p-3 text-right">
                  {h.delinquent ? (
                    <span className="text-red-600 font-medium">yes</span>
                  ) : (
                    "no"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
