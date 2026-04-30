import Link from "next/link";

import BacktestChart from "./BacktestChart";

export const metadata = {
  title: "Backtest — stakesense",
  description: "How our top-K composite picks compare to baselines.",
};

type BacktestRow = {
  epoch: number;
  strategy: string;
  yield?: number;
  incidents?: number;
};

type BacktestResponse = {
  yields: BacktestRow[];
  incidents: BacktestRow[];
  summary: {
    yield_mean?: Record<string, number>;
    incidents_mean?: Record<string, number>;
  };
};

async function fetchBacktest(): Promise<BacktestResponse | null> {
  try {
    const r = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE}/api/v1/backtest?epochs=90`,
      { next: { revalidate: 600 } }
    );
    return r.ok ? r.json() : null;
  } catch {
    return null;
  }
}

export default async function BacktestPage() {
  const data = await fetchBacktest();
  const hasData = data && data.yields.length > 0;

  return (
    <main className="container mx-auto px-6 py-12 max-w-5xl">
      <Link
        href="/"
        className="text-sm text-slate-500 hover:text-slate-900 mb-4 inline-block"
      >
        ← Home
      </Link>
      <h1 className="text-4xl font-bold mb-3">Backtest</h1>
      <p className="text-slate-600 mb-8">
        How would you have done if you had staked to our top-20 composite picks
        each epoch, vs. picking randomly or by decentralization-score alone?
      </p>

      {!hasData ? (
        <div className="border rounded-lg p-8 bg-amber-50 border-amber-200">
          <h2 className="font-semibold mb-2">Not enough history yet</h2>
          <p className="text-sm text-slate-700">
            Backtests need ≥ 30 epochs of accumulated predictions × performance
            data. The cron extends the window by ~1 epoch per run; check back
            after a few days. Until then, use the live{" "}
            <Link
              href="/validators?sort=composite"
              className="text-blue-600 hover:underline"
            >
              composite ranking
            </Link>{" "}
            and the{" "}
            <Link
              href="/methodology"
              className="text-blue-600 hover:underline"
            >
              methodology page
            </Link>{" "}
            to audit the model.
          </p>
        </div>
      ) : (
        <>
          <section className="mb-10">
            <h2 className="text-xl font-bold mb-4">Average yield by strategy</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {data &&
                Object.entries(data.summary.yield_mean ?? {}).map(([k, v]) => (
                  <div key={k} className="border rounded-lg p-5 bg-white">
                    <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">
                      {k === "ours"
                        ? "stakesense composite"
                        : k === "baseline"
                          ? "Decentralization-only baseline"
                          : "Random selection"}
                    </div>
                    <div className="text-2xl font-bold">
                      {(v as number).toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      avg credits / epoch
                    </div>
                  </div>
                ))}
            </div>
            <BacktestChart yields={data!.yields} />
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4">
              Skip-rate incidents per epoch (lower is better)
            </h2>
            <BacktestChart yields={data!.incidents} dataKey="incidents" />
          </section>
        </>
      )}
    </main>
  );
}
