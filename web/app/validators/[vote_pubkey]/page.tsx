import Link from "next/link";

import HistoryCharts from "@/components/HistoryCharts";
import PredictionHistoryChart from "@/components/PredictionHistoryChart";
import { getPredictionHistory, getValidator } from "@/lib/api";

function shortPk(pk: string) {
  return `${pk.slice(0, 4)}…${pk.slice(-4)}`;
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
        <Link
          href={`/compare?vs=${p.vote_pubkey}`}
          className="text-sm px-3 py-1.5 border rounded-lg hover:bg-slate-50"
        >
          Compare with another
        </Link>
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
