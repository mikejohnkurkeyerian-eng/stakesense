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

type Anomaly = {
  kind: string;
  vote_pubkey: string;
  name: string | null;
  summary: string;
  magnitude: number;
};

async function fetchAnomalies(): Promise<Anomaly[]> {
  try {
    const r = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE}/api/v1/anomalies?limit=4`,
      { next: { revalidate: 600 } }
    );
    if (!r.ok) return [];
    const j = await r.json();
    return (j.detections || []) as Anomaly[];
  } catch {
    return [];
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

function anomalyClass(kind: string) {
  if (kind === "newly_delinquent") return "bg-red-100 text-red-900";
  if (kind === "composite_drop") return "bg-orange-100 text-orange-900";
  if (kind === "composite_climb") return "bg-emerald-100 text-emerald-900";
  if (kind === "mev_commission_change") return "bg-amber-100 text-amber-900";
  return "bg-slate-100 text-slate-900";
}

function anomalyLabel(kind: string) {
  if (kind === "newly_delinquent") return "DELINQUENT";
  if (kind === "composite_drop") return "DROP";
  if (kind === "composite_climb") return "CLIMB";
  if (kind === "mev_commission_change") return "MEV Δ";
  return kind;
}

function SurfaceCard({
  href,
  title,
  blurb,
  tone,
}: {
  href: string;
  title: string;
  blurb: string;
  tone: "emerald" | "violet" | "blue" | "slate" | "amber" | "red";
}) {
  const toneClasses: Record<string, string> = {
    emerald: "border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50",
    violet: "border-violet-200 hover:border-violet-400 hover:bg-violet-50",
    blue: "border-blue-200 hover:border-blue-400 hover:bg-blue-50",
    slate: "border-slate-200 hover:border-slate-400 hover:bg-slate-50",
    amber: "border-amber-200 hover:border-amber-400 hover:bg-amber-50",
    red: "border-red-200 hover:border-red-400 hover:bg-red-50",
  };
  return (
    <Link
      href={href}
      className={`border rounded-lg p-4 bg-white transition-all ${toneClasses[tone]}`}
    >
      <div className="font-semibold text-slate-900 mb-1">{title} →</div>
      <div className="text-xs text-slate-600">{blurb}</div>
    </Link>
  );
}

export default async function Home() {
  const [stats, picks, anomalies] = await Promise.all([
    fetchStats(),
    fetchTopPicks(),
    fetchAnomalies(),
  ]);
  const ldjson = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "@id": "https://stakesense-el77-git-main-california-mortgage-solutions.vercel.app/#app",
        name: "stakesense",
        description:
          "ML-powered Solana validator scoring on three pillars: predicted downtime risk, MEV tax, decentralization.",
        applicationCategory: "FinanceApplication",
        operatingSystem: "Web",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        license: "https://opensource.org/licenses/MIT",
        codeRepository: "https://github.com/mikejohnkurkeyerian-eng/stakesense",
      },
      {
        "@type": "Dataset",
        "@id": "https://stakesense-el77-git-main-california-mortgage-solutions.vercel.app/#dataset",
        name: "Stakesense Validator Predictions",
        description:
          "Daily-refreshed predictions of downtime risk, MEV tax, and decentralization scores for every active Solana mainnet validator.",
        license: "https://creativecommons.org/licenses/by/4.0/",
        creator: {
          "@type": "Organization",
          name: "stakesense",
          url: "https://github.com/mikejohnkurkeyerian-eng/stakesense",
        },
        keywords: [
          "Solana",
          "validators",
          "staking",
          "MEV",
          "decentralization",
          "Nakamoto coefficient",
          "machine learning",
        ],
        temporalCoverage: "2026-04-29/..",
        distribution: [
          {
            "@type": "DataDownload",
            encodingFormat: "text/csv",
            contentUrl:
              "https://stakesense.onrender.com/api/v1/export/predictions.csv",
          },
          {
            "@type": "DataDownload",
            encodingFormat: "application/json",
            contentUrl:
              "https://stakesense.onrender.com/api/v1/export/predictions.json",
          },
        ],
        isAccessibleForFree: true,
      },
      {
        "@type": "Organization",
        name: "stakesense",
        url: "https://github.com/mikejohnkurkeyerian-eng/stakesense",
        sameAs: [
          "https://github.com/mikejohnkurkeyerian-eng/stakesense",
        ],
      },
    ],
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
          <Link
            href="/portfolio"
            className="px-6 py-3 border border-emerald-300 bg-emerald-50 text-emerald-900 rounded-lg hover:bg-emerald-100 font-medium"
          >
            Analyze your wallet ↗
          </Link>
          <Link
            href="/integrations/mcp"
            className="px-6 py-3 border border-violet-300 bg-violet-50 text-violet-900 rounded-lg hover:bg-violet-100 font-medium"
          >
            MCP server ↗
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
        <p className="text-xs text-slate-500 mt-6">
          Or query stakesense from Claude / Cursor:{" "}
          <code className="bg-slate-100 px-2 py-0.5 rounded font-mono">
            claude mcp add stakesense -- npx stakesense-mcp
          </code>
        </p>
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

      {anomalies.length > 0 && (
        <section className="container mx-auto px-6 pb-16">
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">What changed recently</h2>
              <p className="text-sm text-slate-500">
                Top movers from the latest cron run. See all on{" "}
                <Link href="/alerts" className="text-violet-700 underline">
                  /alerts
                </Link>
                .
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {anomalies.slice(0, 4).map((a) => (
              <Link
                key={`${a.kind}-${a.vote_pubkey}`}
                href={`/validators/${a.vote_pubkey}`}
                className="border rounded-lg p-4 bg-white hover:border-violet-400 hover:shadow-sm transition-all"
              >
                <div className="flex items-start gap-2 mb-2">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-bold flex-shrink-0 ${anomalyClass(a.kind)}`}
                  >
                    {anomalyLabel(a.kind)}
                  </span>
                  <span className="font-medium text-slate-900 text-sm">
                    {a.name || shortPk(a.vote_pubkey)}
                  </span>
                </div>
                <div className="text-xs text-slate-600">{a.summary}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="container mx-auto px-6 pb-16">
        <h2 className="text-2xl font-bold mb-1">More ways to use stakesense</h2>
        <p className="text-sm text-slate-500 mb-6">
          The same predictions, surfaced wherever you work.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <SurfaceCard
            href="/portfolio"
            title="Portfolio analyzer"
            blurb="Paste any wallet → see exposure + rebalance suggestions"
            tone="emerald"
          />
          <SurfaceCard
            href="/integrations/mcp"
            title="MCP server"
            blurb="Claude Desktop / Cursor query stakesense natively"
            tone="violet"
          />
          <SurfaceCard
            href="/widget"
            title="Embeddable widget"
            blurb="Drop a score on any Solana site with one <script>"
            tone="blue"
          />
          <SurfaceCard
            href="/data"
            title="Open data exports"
            blurb="Daily CSV/JSON snapshots, CC-BY 4.0"
            tone="slate"
          />
          <SurfaceCard
            href="/research"
            title="Research dashboard"
            blurb="Live decentralization stats + top clusters"
            tone="amber"
          />
          <SurfaceCard
            href="/alerts"
            title="Recent changes"
            blurb="MEV jumps, delinquencies, score movers"
            tone="red"
          />
          <SurfaceCard
            href="/compare"
            title="Side-by-side compare"
            blurb="Two validators across all three pillars"
            tone="slate"
          />
          <SurfaceCard
            href="/backtest"
            title="Backtest"
            blurb="Strategy performance over historical predictions"
            tone="slate"
          />
          <SurfaceCard
            href="/playground"
            title="API playground"
            blurb="Interactive explorer for every public endpoint"
            tone="violet"
          />
          <SurfaceCard
            href="/stake/multisig"
            title="Multisig staking"
            blurb="Squads / Realms-compatible stake-tx generator"
            tone="emerald"
          />
          <SurfaceCard
            href="/changelog"
            title="Changelog"
            blurb="From git init to public-goods oracle in 6 days"
            tone="slate"
          />
        </div>
      </section>

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
