import Link from "next/link";

import type { Recommendation } from "@/lib/types";

type Stats = {
  avg_mev_tax: number | null;
  avg_downtime_prob: number | null;
  avg_decentralization: number | null;
  avg_composite: number | null;
  total_scored: number;
  active_validators: number;
  latest_epoch: number | null;
  latest_prediction_date: string | null;
  nakamoto_coefficient: number | null;
};

async function fetchStats(): Promise<Stats | null> {
  try {
    const r = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE}/api/v1/validators/stats`,
      { next: { revalidate: 300 } }
    );
    return r.ok ? r.json() : null;
  } catch {
    return null;
  }
}

async function fetchTopPicks(): Promise<Recommendation[] | null> {
  try {
    const r = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE}/api/v1/recommend`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount_sol: 100,
          risk_profile: "balanced",
          count: 3,
        }),
        next: { revalidate: 300 },
      }
    );
    if (!r.ok) return null;
    const j = await r.json();
    return j.recommendations as Recommendation[];
  } catch {
    return null;
  }
}

function pct(x: number | null | undefined) {
  return x == null ? "—" : `${(x * 100).toFixed(1)}%`;
}

function shortPk(pk: string) {
  return `${pk.slice(0, 4)}…${pk.slice(-4)}`;
}

export default async function Home() {
  const [stats, picks] = await Promise.all([fetchStats(), fetchTopPicks()]);
  const ldjson = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "stakesense",
    description:
      "ML-powered Solana validator scoring on three pillars: predicted downtime risk, MEV tax, decentralization.",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    license: "https://opensource.org/licenses/MIT",
  };
  return (
    <main className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ldjson) }}
      />
      <section className="container mx-auto px-6 py-20 text-center">
        <div className="mb-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Open-source · MIT · Public Goods tier · Solana Frontier 2026
        </div>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
          Stake smarter.
          <br />
          <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent">
            Decentralize Solana.
          </span>
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-10">
          ML-powered validator scoring on three pillars: predicted downtime risk,
          MEV-extracted-from-delegators, and decentralization impact. Updated every epoch.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link
            href="/validators"
            className="px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium"
          >
            Browse validators
          </Link>
          <a
            href={`${process.env.NEXT_PUBLIC_API_BASE}/docs`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 border border-slate-300 rounded-lg hover:bg-slate-50 font-medium"
          >
            API docs ↗
          </a>
        </div>
      </section>

      {stats && (
        <section className="container mx-auto px-6 pb-16">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="border rounded-lg p-6 bg-white">
              <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">
                Validators scored
              </div>
              <div className="text-3xl font-bold">
                {stats.total_scored.toLocaleString()}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                of {stats.active_validators.toLocaleString()} active
              </div>
            </div>
            <div className="border rounded-lg p-6 bg-white">
              <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">
                Nakamoto coeff
              </div>
              <div className="text-3xl font-bold">
                {stats.nakamoto_coefficient ?? "—"}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                validators = ⅓ stake
              </div>
            </div>
            <div className="border rounded-lg p-6 bg-white">
              <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">
                Avg downtime risk
              </div>
              <div className="text-3xl font-bold">
                {pct(stats.avg_downtime_prob)}
              </div>
              <div className="text-xs text-slate-400 mt-1">predicted, 7d</div>
            </div>
            <div className="border rounded-lg p-6 bg-white">
              <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">
                Avg MEV tax
              </div>
              <div className="text-3xl font-bold">{pct(stats.avg_mev_tax)}</div>
              <div className="text-xs text-slate-400 mt-1">commission on MEV</div>
            </div>
            <div className="border rounded-lg p-6 bg-white">
              <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">
                Latest epoch
              </div>
              <div className="text-3xl font-bold">{stats.latest_epoch ?? "—"}</div>
              <div className="text-xs text-slate-400 mt-1">
                {stats.latest_prediction_date ?? ""}
              </div>
            </div>
          </div>
        </section>
      )}

      {picks && picks.length > 0 && (
        <section className="container mx-auto px-6 pb-16">
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold">Top picks right now</h2>
              <p className="text-sm text-slate-500">
                Balanced risk profile, recomputed every cron run. Click through
                to delegate.
              </p>
            </div>
            <Link
              href="/stake"
              className="text-sm text-blue-600 hover:underline"
            >
              See all picks + stake →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {picks.map((p, i) => (
              <Link
                key={p.vote_pubkey}
                href={`/validators/${p.vote_pubkey}`}
                className="border rounded-lg p-5 bg-white hover:border-violet-400 hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs uppercase tracking-wide text-violet-600 font-semibold">
                    #{i + 1} pick
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    {(p.composite_score ?? 0).toFixed(3)}
                  </span>
                </div>
                <div className="font-semibold mb-1">
                  {p.name ?? shortPk(p.vote_pubkey)}
                </div>
                <div className="text-xs font-mono text-slate-400 mb-3 break-all">
                  {p.vote_pubkey}
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Downtime risk</span>
                    <span className="font-medium">
                      {pct(p.downtime_prob_7d)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">MEV tax</span>
                    <span className="font-medium">{pct(p.mev_tax_rate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Decentralization</span>
                    <span className="font-medium">
                      {(p.decentralization_score ?? 0).toFixed(3)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Commission</span>
                    <span className="font-medium">{p.commission_pct ?? "—"}%</span>
                  </div>
                </div>
                <div className="text-xs text-slate-500 mt-3 italic">
                  {p.reasoning}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="container mx-auto px-6 pb-20">
        <h2 className="text-3xl font-bold mb-8 text-center">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border rounded-lg p-6">
            <div className="text-sm font-semibold text-violet-600 mb-2">
              1. Downtime risk
            </div>
            <p className="text-sm text-slate-600">
              LightGBM classifier trained on rolling 5-epoch validator performance
              predicts the probability of a skip-rate spike or delinquency in the
              next 3 epochs.
            </p>
          </div>
          <div className="border rounded-lg p-6">
            <div className="text-sm font-semibold text-blue-600 mb-2">
              2. MEV tax
            </div>
            <p className="text-sm text-slate-600">
              Reads Jito MEV commission per validator. The fraction of MEV revenue
              the validator keeps for themselves vs. passing back to delegators.
            </p>
          </div>
          <div className="border rounded-lg p-6">
            <div className="text-sm font-semibold text-emerald-600 mb-2">
              3. Decentralization
            </div>
            <p className="text-sm text-slate-600">
              Penalizes validators that share a data center, ASN, or country with
              many others. Bonus for staying outside the top-30 by stake
              (superminority).
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
