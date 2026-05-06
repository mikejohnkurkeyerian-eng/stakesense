import Link from "next/link";

export const metadata = {
  title: "State of Solana validators — stakesense research",
  description:
    "Live analysis of Solana validator decentralization, concentration, and quality drawn from stakesense's open dataset. Updated twice daily.",
  alternates: { canonical: "/research" },
};

export const dynamic = "force-dynamic";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "https://stakesense.onrender.com";

type Stats = {
  active_validators: number;
  total_scored: number;
  nakamoto_coefficient: number | null;
  avg_composite: number | null;
  avg_downtime_prob: number | null;
  avg_mev_tax: number | null;
  avg_decentralization: number | null;
  latest_epoch: number | null;
};

type Cluster = {
  cluster: string;
  n_validators: number;
  total_stake: number | null;
};

type ClustersResp = { by: string; clusters: Cluster[] };

async function fetchStats(): Promise<Stats | null> {
  try {
    const r = await fetch(`${API_BASE}/api/v1/validators/stats`, {
      next: { revalidate: 1800 },
      signal: AbortSignal.timeout(15_000),
    });
    return r.ok ? r.json() : null;
  } catch {
    return null;
  }
}

async function fetchClusters(by: string): Promise<ClustersResp | null> {
  try {
    const r = await fetch(`${API_BASE}/api/v1/validators/clusters?by=${by}&top=10`, {
      next: { revalidate: 1800 },
      signal: AbortSignal.timeout(15_000),
    });
    return r.ok ? r.json() : null;
  } catch {
    return null;
  }
}

type HistoryPoint = {
  date: string;
  n_scored: number;
  avg_decentralization: number | null;
  avg_composite: number | null;
  avg_downtime: number | null;
  avg_mev_tax: number | null;
  n_high: number;
  n_low: number;
};

type HistoryResp = { series: HistoryPoint[]; n_days: number };

async function fetchHistory(): Promise<HistoryResp | null> {
  try {
    const r = await fetch(`${API_BASE}/api/v1/export/decentralization/history?days=30`, {
      next: { revalidate: 1800 },
      signal: AbortSignal.timeout(15_000),
    });
    return r.ok ? r.json() : null;
  } catch {
    return null;
  }
}

function pct(x: number | null | undefined) {
  return x == null ? "—" : `${(x * 100).toFixed(1)}%`;
}

function lamportsToSol(l: number | null) {
  if (l == null) return "—";
  return `${(l / 1e9).toLocaleString(undefined, { maximumFractionDigits: 0 })} SOL`;
}

export default async function ResearchPage() {
  const [stats, dcClusters, asnClusters, countryClusters, history] = await Promise.all([
    fetchStats(),
    fetchClusters("data_center"),
    fetchClusters("asn"),
    fetchClusters("country"),
    fetchHistory(),
  ]);

  return (
    <main className="container mx-auto px-6 py-12 max-w-4xl">
      <Link
        href="/"
        className="text-sm text-slate-500 hover:text-slate-900 mb-4 inline-block"
      >
        ← Home
      </Link>
      <h1 className="text-4xl font-bold mb-3">
        State of Solana validators
      </h1>
      <p className="text-slate-600 mb-3 text-lg">
        Open analysis of validator decentralization and quality — drawn from
        stakesense&apos;s public dataset, refreshed twice daily.
      </p>
      <p className="text-slate-500 text-sm mb-10">
        Latest data: epoch {stats?.latest_epoch ?? "—"} · License: CC-BY 4.0
      </p>

      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4 text-violet-700">
          Network at a glance
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Active validators" value={stats?.active_validators?.toLocaleString() ?? "—"} />
          <Stat
            label="Nakamoto coefficient"
            value={stats?.nakamoto_coefficient?.toString() ?? "—"}
            subtext="validators control ⅓ stake"
          />
          <Stat label="Avg composite" value={pct(stats?.avg_composite)} />
          <Stat
            label="Avg downtime risk"
            value={pct(stats?.avg_downtime_prob)}
            subtext="predicted, 7d"
          />
        </div>
      </section>

      {history && history.series.length >= 2 && (
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-3 text-violet-700">
            Decentralization trend ({history.n_days}d)
          </h2>
          <p className="text-sm text-slate-600 mb-3">
            Average decentralization score across all scored validators per
            day. Higher = stake spreads across more independent operators.
          </p>
          <SparkChart
            series={history.series}
            getValue={(p) => p.avg_decentralization}
            colorClass="text-violet-600"
            label="Avg decentralization"
          />
          <div className="grid grid-cols-2 gap-3 mt-4">
            <SparkChart
              series={history.series}
              getValue={(p) => p.avg_composite}
              colorClass="text-emerald-600"
              label="Avg composite"
              compact
            />
            <SparkChart
              series={history.series}
              getValue={(p) => p.avg_mev_tax}
              colorClass="text-amber-600"
              label="Avg MEV tax"
              compact
            />
          </div>
        </section>
      )}

      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-3 text-violet-700">
          The decentralization story
        </h2>
        <p className="text-slate-700 mb-4">
          Solana&apos;s halt-resistance depends on{" "}
          <em>which validators control how much stake</em>. The Nakamoto
          coefficient — the minimum number of validators whose combined stake
          exceeds 33% of the total — is the headline metric. Right now it sits
          at <strong>{stats?.nakamoto_coefficient ?? "—"}</strong>.
        </p>
        <p className="text-slate-700">
          But Nakamoto is a coarse signal. The shape of the long tail —
          hosting providers, ASNs, geographies — affects real-world
          resilience. Stakesense surfaces all three.
        </p>
      </section>

      {dcClusters && dcClusters.clusters.length > 0 && (
        <ClusterSection
          title="Top data centers by validator count"
          subtitle="Where the validators actually live"
          rows={dcClusters.clusters}
          insightForTopBucket={(top) =>
            `The top data center hosts ${top.n_validators} validators${
              stats?.active_validators
                ? ` — that's ${pct(top.n_validators / stats.active_validators)} of the active set`
                : ""
            }.`
          }
        />
      )}

      {asnClusters && asnClusters.clusters.length > 0 && (
        <ClusterSection
          title="Top ASNs (autonomous systems)"
          subtitle="The internet-routing layer beneath the data centers"
          rows={asnClusters.clusters}
          insightForTopBucket={(top) =>
            `The largest single ASN owns ${top.n_validators} validators. ASNs cross data centers, so concentration here is harder to fix by spreading geographically.`
          }
        />
      )}

      {countryClusters && countryClusters.clusters.length > 0 && (
        <ClusterSection
          title="Top countries by validator count"
          subtitle="Geographic and regulatory tail risk"
          rows={countryClusters.clusters}
          insightForTopBucket={(top) =>
            `${top.cluster} hosts ${top.n_validators} active validators. A regulatory action in one country can cascade if the validators there share other characteristics (data center, ASN, operator).`
          }
        />
      )}

      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-3 text-violet-700">
          What stakesense scores
        </h2>
        <ul className="text-slate-700 space-y-3">
          <li className="border-l-2 border-violet-300 pl-4">
            <strong>Predicted downtime risk</strong> — LightGBM probability
            that a validator will skip too many blocks or go delinquent in the
            next 3 epochs.{" "}
            <span className="text-slate-500">
              Network average: {pct(stats?.avg_downtime_prob)}.
            </span>
          </li>
          <li className="border-l-2 border-violet-300 pl-4">
            <strong>MEV tax</strong> — fraction of MEV revenue the validator
            keeps for themselves vs. passes to delegators.{" "}
            <span className="text-slate-500">
              Network average: {pct(stats?.avg_mev_tax)}.
            </span>
          </li>
          <li className="border-l-2 border-violet-300 pl-4">
            <strong>Decentralization</strong> — penalty for sharing data
            center / ASN / country with many others, plus a superminority
            penalty.{" "}
            <span className="text-slate-500">
              Network average: {pct(stats?.avg_decentralization)}.
            </span>
          </li>
        </ul>
        <p className="text-slate-700 mt-4">
          Read the long-form{" "}
          <Link href="/methodology" className="text-violet-700 underline">
            methodology
          </Link>{" "}
          for feature engineering, training, and limitations.
        </p>
      </section>

      <section className="mb-12 border rounded-lg p-6 bg-violet-50">
        <h2 className="text-xl font-bold mb-3 text-violet-900">
          Use this data
        </h2>
        <p className="text-slate-700 mb-3">
          Every number on this page comes from public, reusable APIs:
        </p>
        <ul className="text-sm text-slate-700 space-y-1 list-disc pl-6 mb-3">
          <li>
            <code className="bg-white px-1.5 py-0.5 rounded text-xs">
              GET /api/v1/validators/stats
            </code>
          </li>
          <li>
            <code className="bg-white px-1.5 py-0.5 rounded text-xs">
              GET /api/v1/validators/clusters?by=data_center|asn|country
            </code>
          </li>
          <li>
            <code className="bg-white px-1.5 py-0.5 rounded text-xs">
              GET /api/v1/export/decentralization.json
            </code>
          </li>
        </ul>
        <p className="text-sm text-slate-600">
          Or download daily CSV snapshots at{" "}
          <Link href="/data" className="text-violet-700 underline">
            /data
          </Link>
          . Released under CC-BY 4.0 — attribution to{" "}
          <code className="text-xs">stakesense</code> appreciated.
        </p>
      </section>

      <section className="text-sm text-slate-500 border-t pt-6">
        Predictions are not investment advice. The dataset is point-in-time;
        earlier snapshots may show different concentration as validators come
        and go.
      </section>
    </main>
  );
}

function Stat({
  label,
  value,
  subtext,
}: {
  label: string;
  value: string;
  subtext?: string;
}) {
  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">
        {label}
      </div>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      {subtext && (
        <div className="text-xs text-slate-400 mt-1">{subtext}</div>
      )}
    </div>
  );
}

function ClusterSection({
  title,
  subtitle,
  rows,
  insightForTopBucket,
}: {
  title: string;
  subtitle: string;
  rows: Cluster[];
  insightForTopBucket: (top: Cluster) => string;
}) {
  const top = rows[0];
  return (
    <section className="mb-10">
      <h2 className="text-2xl font-bold mb-1 text-slate-900">{title}</h2>
      <p className="text-slate-500 text-sm mb-4">{subtitle}</p>
      <div className="border rounded-lg p-5 bg-violet-50 mb-4">
        <p className="text-sm text-violet-900">{insightForTopBucket(top)}</p>
      </div>
      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-sm min-w-[420px]">
          <thead className="bg-slate-100">
            <tr>
              <th className="text-left px-3 py-2">Cluster</th>
              <th className="text-right px-3 py-2 whitespace-nowrap">Validators</th>
              <th className="text-right px-3 py-2 whitespace-nowrap">Total stake</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c, i) => (
              <tr key={`${c.cluster}-${i}`} className="border-t">
                <td className="px-3 py-2 text-slate-700 break-all">{c.cluster}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {c.n_validators}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-500 whitespace-nowrap">
                  {lamportsToSol(c.total_stake)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SparkChart({
  series,
  getValue,
  colorClass,
  label,
  compact = false,
}: {
  series: HistoryPoint[];
  getValue: (p: HistoryPoint) => number | null;
  colorClass: string;
  label: string;
  compact?: boolean;
}) {
  const points = series
    .map((p, i) => ({ idx: i, val: getValue(p), date: p.date }))
    .filter((p): p is { idx: number; val: number; date: string } => p.val != null);
  if (points.length < 2) {
    return (
      <div className="border rounded-lg p-4 bg-white text-sm text-slate-500">
        {label}: not enough data points yet
      </div>
    );
  }
  const W = 600;
  const H = compact ? 80 : 140;
  const Pad = 24;
  const vals = points.map((p) => p.val);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const stepX = (W - Pad * 2) / (points.length - 1);
  const path = points
    .map((p, i) => {
      const x = Pad + i * stepX;
      const y = Pad + (1 - (p.val - min) / span) * (H - Pad * 2);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const first = points[0];
  const last = points[points.length - 1];
  const delta = last.val - first.val;
  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="flex justify-between items-baseline mb-2">
        <div className="text-sm font-semibold">{label}</div>
        <div className="text-xs tabular-nums">
          <span className="text-slate-500">{first.val.toFixed(3)}</span>
          {" → "}
          <span className="font-semibold">{last.val.toFixed(3)}</span>
          <span
            className={
              "ml-2 " +
              (delta > 0 ? "text-emerald-600" : delta < 0 ? "text-red-600" : "text-slate-500")
            }
          >
            ({delta >= 0 ? "+" : ""}
            {delta.toFixed(3)})
          </span>
        </div>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className={`w-full ${colorClass}`}
        role="img"
        aria-label={`${label} sparkline`}
      >
        <path d={path} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={Pad + i * stepX}
            cy={Pad + (1 - (p.val - min) / span) * (H - Pad * 2)}
            r={i === points.length - 1 ? 3.5 : 2}
            fill="currentColor"
          />
        ))}
      </svg>
      {!compact && (
        <div className="flex justify-between text-[10px] text-slate-400 mt-1">
          <span>{first.date}</span>
          <span>{last.date}</span>
        </div>
      )}
    </div>
  );
}
