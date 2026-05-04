import Link from "next/link";

import PredictionHistoryChart from "@/components/PredictionHistoryChart";
import type { PredictionPoint } from "@/lib/api";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "https://stakesense.onrender.com";

type Validator = {
  vote_pubkey: string;
  name: string | null;
  commission_pct: number | null;
  active_stake: number | null;
  data_center: string | null;
  asn: string | null;
  country: string | null;
  composite_score: number | null;
  downtime_prob_7d: number | null;
  mev_tax_rate: number | null;
  decentralization_score: number | null;
};

type Rank = {
  vote_pubkey: string;
  total_validators: number;
  rank_composite: number;
  rank_downtime: number;
  rank_mev_tax: number;
  rank_decentralization: number;
  percentile_composite: number | null;
  current_composite: number | null;
  current_downtime_prob: number | null;
  current_mev_tax: number | null;
  current_decentralization: number | null;
  cutoff_top10_composite: number | null;
  cutoff_top50_composite: number | null;
  cutoff_top100_composite: number | null;
  gap_to_top10: number | null;
  gap_to_top50: number | null;
};

type PredictionRow = PredictionPoint;

async function fetchValidator(pk: string): Promise<{ validator: Validator } | null> {
  try {
    const r = await fetch(`${API_BASE}/api/v1/validators/${pk}`, {
      next: { revalidate: 600 },
    });
    return r.ok ? r.json() : null;
  } catch {
    return null;
  }
}

async function fetchRank(pk: string): Promise<Rank | null> {
  try {
    const r = await fetch(`${API_BASE}/api/v1/validators/${pk}/rank`, {
      next: { revalidate: 600 },
    });
    return r.ok ? r.json() : null;
  } catch {
    return null;
  }
}

async function fetchHistory(pk: string): Promise<PredictionRow[] | null> {
  try {
    const r = await fetch(
      `${API_BASE}/api/v1/validators/${pk}/predictions?limit=30`,
      { next: { revalidate: 600 } }
    );
    if (!r.ok) return null;
    const j = await r.json();
    return j.history as PredictionRow[];
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ vote_pubkey: string }>;
}) {
  const p = await params;
  return {
    title: `Operator view — ${p.vote_pubkey.slice(0, 8)}…`,
    description:
      "Validator-side view of stakesense scoring: rank, percentile, gap to top-10, and improvement levers.",
    alternates: { canonical: `/operator/${p.vote_pubkey}` },
  };
}

function pct(x: number | null | undefined) {
  return x == null ? "—" : `${(x * 100).toFixed(1)}%`;
}

function shortPk(pk: string) {
  return `${pk.slice(0, 4)}…${pk.slice(-4)}`;
}

export default async function OperatorPage({
  params,
}: {
  params: Promise<{ vote_pubkey: string }>;
}) {
  const { vote_pubkey } = await params;
  const [data, rank, history] = await Promise.all([
    fetchValidator(vote_pubkey),
    fetchRank(vote_pubkey),
    fetchHistory(vote_pubkey),
  ]);

  if (!data) {
    return (
      <main className="container mx-auto px-6 py-12 max-w-3xl">
        <h1 className="text-3xl font-bold mb-4">Validator not found</h1>
        <p className="text-slate-600">
          We don&apos;t have scoring data for{" "}
          <code className="font-mono text-sm">{vote_pubkey}</code>. If this is
          a new mainnet validator, it should appear after the next cron run
          (within ~12 hours).
        </p>
        <Link
          href="/validators"
          className="mt-6 inline-block text-violet-700 underline"
        >
          ← All validators
        </Link>
      </main>
    );
  }

  const v = data.validator;
  const improvements = buildImprovementSuggestions(v, rank);

  return (
    <main className="container mx-auto px-6 py-12 max-w-4xl">
      <Link
        href={`/validators/${vote_pubkey}`}
        className="text-sm text-slate-500 hover:text-slate-900 mb-4 inline-block"
      >
        ← Delegator view
      </Link>

      <div className="flex items-center gap-3 mb-3">
        <h1 className="text-3xl font-bold">{v.name || shortPk(v.vote_pubkey)}</h1>
        <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold">
          Operator view
        </span>
      </div>
      <p className="text-slate-500 font-mono text-xs mb-8 break-all">
        {v.vote_pubkey}
      </p>

      {rank && (
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-3">Where you rank</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <RankCard
              label="Composite"
              rank={rank.rank_composite}
              total={rank.total_validators}
              percentile={rank.percentile_composite}
            />
            <RankCard
              label="Downtime"
              rank={rank.rank_downtime}
              total={rank.total_validators}
            />
            <RankCard
              label="MEV tax"
              rank={rank.rank_mev_tax}
              total={rank.total_validators}
            />
            <RankCard
              label="Decentralization"
              rank={rank.rank_decentralization}
              total={rank.total_validators}
            />
          </div>
          {rank.gap_to_top10 != null && rank.gap_to_top10 > 0 && (
            <div className="mt-4 border-l-4 border-amber-400 bg-amber-50 p-4 rounded text-sm text-amber-900">
              You&apos;re <strong>{(rank.gap_to_top10 * 100).toFixed(1)}pts</strong>{" "}
              below the top-10 composite cutoff (
              {pct(rank.cutoff_top10_composite)}).
            </div>
          )}
          {rank.gap_to_top10 != null && rank.gap_to_top10 <= 0 && (
            <div className="mt-4 border-l-4 border-emerald-400 bg-emerald-50 p-4 rounded text-sm text-emerald-900">
              You&apos;re inside the top-10. Nice.
            </div>
          )}
        </section>
      )}

      {improvements.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-3">
            What would improve your score
          </h2>
          <ul className="space-y-3">
            {improvements.map((s, i) => (
              <li
                key={i}
                className="border rounded-lg p-4 bg-white flex items-start gap-3"
              >
                <span className="px-2 py-1 rounded bg-violet-100 text-violet-900 text-xs font-bold flex-shrink-0">
                  +{(s.estimated_gain * 100).toFixed(1)}pts
                </span>
                <div>
                  <div className="font-semibold text-slate-900">{s.title}</div>
                  <div className="text-sm text-slate-600 mt-1">{s.detail}</div>
                </div>
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-500 mt-3">
            Estimates are derived from the composite formula (
            <code>0.5·(1−downtime) + 0.3·(1−mev_tax) + 0.2·decentralization</code>
            ). Actual gain depends on training-data updates and how your
            improvement compares to the rest of the cohort.
          </p>
        </section>
      )}

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-3">Profile</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <Field label="Commission" value={v.commission_pct != null ? `${v.commission_pct}%` : "—"} />
          <Field
            label="Active stake"
            value={
              v.active_stake != null
                ? `${(v.active_stake / 1e9).toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })} SOL`
                : "—"
            }
          />
          <Field label="Data center" value={v.data_center || "(not registered on validators.app)"} />
          <Field label="ASN" value={v.asn || "—"} />
          <Field label="Country" value={v.country || "—"} />
        </div>
        {!v.data_center && (
          <div className="mt-4 border-l-4 border-amber-400 bg-amber-50 p-4 rounded text-sm text-amber-900">
            <strong>Tip:</strong> Register on{" "}
            <a
              href="https://www.validators.app"
              className="underline"
              target="_blank"
              rel="noopener"
            >
              validators.app
            </a>{" "}
            to add your data center, ASN, and country. Without that metadata
            the decentralization scorer falls back to a flat default — costing
            you visible points on the composite.
          </div>
        )}
      </section>

      {history && history.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-3">Score history (30 days)</h2>
          <PredictionHistoryChart history={history} />
        </section>
      )}

      <section className="text-sm text-slate-500 border-t pt-6 space-y-2">
        <p>
          This is the <em>operator-side</em> view of stakesense scoring. The{" "}
          <Link
            href={`/validators/${vote_pubkey}`}
            className="text-violet-700 underline"
          >
            delegator-side view
          </Link>{" "}
          surfaces the same data with different framing — both reading the same
          public dataset.
        </p>
        <p>
          Have feedback on how we score?{" "}
          <a
            href="https://github.com/mikejohnkurkeyerian-eng/stakesense/issues/new"
            className="text-violet-700 underline"
          >
            Open an issue
          </a>{" "}
          — we welcome corrections, especially from operators.
        </p>
      </section>
    </main>
  );
}

function RankCard({
  label,
  rank,
  total,
  percentile,
}: {
  label: string;
  rank: number;
  total: number;
  percentile?: number | null;
}) {
  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">
        {label}
      </div>
      <div className="text-2xl font-bold tabular-nums">
        #{rank}
        <span className="text-sm font-normal text-slate-500"> / {total}</span>
      </div>
      {percentile != null && (
        <div className="text-xs text-slate-400 mt-1">
          {(percentile * 100).toFixed(1)}th percentile
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="border rounded-lg p-3 bg-white">
      <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">
        {label}
      </div>
      <div className="text-slate-900">{value}</div>
    </div>
  );
}

function buildImprovementSuggestions(
  v: Validator,
  rank: Rank | null
): { title: string; detail: string; estimated_gain: number }[] {
  const out: { title: string; detail: string; estimated_gain: number }[] = [];

  // Downtime — every 10pp of downtime probability lost = +5pts of composite
  if (v.downtime_prob_7d != null && v.downtime_prob_7d > 0.05) {
    const gain = 0.5 * (v.downtime_prob_7d - 0.05);
    out.push({
      title: `Reduce downtime probability from ${pct(v.downtime_prob_7d)} toward 5%`,
      detail:
        "Tighten skip-rate variance. Common causes are RPC backend instability, missed votes during snapshots, and validator software upgrades during high block-production windows.",
      estimated_gain: gain,
    });
  }

  // MEV tax — lower commission_bps if running Jito with high fee
  if (v.mev_tax_rate != null && v.mev_tax_rate > 0.10) {
    const target = Math.max(0.05, v.mev_tax_rate - 0.10);
    const gain = 0.3 * (v.mev_tax_rate - target);
    out.push({
      title: `Lower MEV commission toward ${pct(target)}`,
      detail:
        "Validators retaining a large share of MEV revenue rank lower on the MEV-tax pillar. Passing more MEV to delegators directly raises composite. Set Jito commission accordingly.",
      estimated_gain: gain,
    });
  }

  // Decentralization — register metadata if missing
  if (!v.data_center || !v.asn || !v.country) {
    out.push({
      title: "Register full metadata on validators.app",
      detail:
        "Without data_center / ASN / country, the decentralization scorer falls back to a flat default. Once registered, validators in rare clusters automatically score higher.",
      estimated_gain: 0.05, // rough — depends on actual cluster
    });
  }

  // Decentralization — high cluster concentration
  if (
    v.decentralization_score != null &&
    v.decentralization_score < 0.5 &&
    v.data_center
  ) {
    out.push({
      title: `Move out of crowded data centers (${v.data_center})`,
      detail:
        "Decentralization-pillar penalty is largest when many validators share the same data center / ASN. Migrating to an under-represented host is the single most score-positive infra move available.",
      estimated_gain: 0.1,
    });
  }

  // Stake — superminority warning
  if (
    v.active_stake != null &&
    v.active_stake > 0 &&
    rank != null &&
    rank.rank_decentralization > rank.total_validators * 0.5
  ) {
    out.push({
      title: "You're in the lower half on decentralization",
      detail:
        "If you're inside the superminority bracket (top of stake distribution), the scorer applies a small penalty. Operators close to the threshold may benefit from publicly capping new delegations.",
      estimated_gain: 0.02,
    });
  }

  return out.sort((a, b) => b.estimated_gain - a.estimated_gain).slice(0, 5);
}
