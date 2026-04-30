import Link from "next/link";

type Stats = {
  avg_mev_tax: number | null;
  avg_downtime_prob: number | null;
  avg_decentralization: number | null;
  avg_composite: number | null;
  total_scored: number;
  active_validators: number;
  latest_epoch: number | null;
  latest_prediction_date: string | null;
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

function pct(x: number | null | undefined) {
  return x == null ? "—" : `${(x * 100).toFixed(1)}%`;
}

export default async function Home() {
  const stats = await fetchStats();
  return (
    <main className="min-h-screen">
      <section className="container mx-auto px-6 py-20 text-center">
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                Avg downtime risk
              </div>
              <div className="text-3xl font-bold">
                {pct(stats.avg_downtime_prob)}
              </div>
              <div className="text-xs text-slate-400 mt-1">predicted, 7d horizon</div>
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
