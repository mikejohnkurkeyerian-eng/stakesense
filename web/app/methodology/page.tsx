import Link from "next/link";

export const metadata = {
  title: "Methodology — stakesense",
  description:
    "How stakesense scores Solana validators on three pillars: downtime risk, MEV tax, and decentralization.",
};

export default function MethodologyPage() {
  return (
    <main className="container mx-auto px-6 py-12 max-w-3xl">
      <Link
        href="/"
        className="text-sm text-slate-500 hover:text-slate-900 mb-4 inline-block"
      >
        ← Home
      </Link>
      <h1 className="text-4xl font-bold mb-3">Methodology</h1>
      <p className="text-slate-600 mb-10">
        How stakesense computes its three pillar scores and the composite. We
        publish this in detail so delegators can audit our judgment and
        re-weight the pillars to fit their own preferences.
      </p>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-3 text-violet-700">
          1. Downtime risk
        </h2>
        <p className="text-slate-700 mb-3">
          A LightGBM gradient-boosted classifier predicts the probability that a
          validator will have <em>any</em> epoch with skip-rate &gt; 5% or be
          flagged delinquent in the next 3 epochs (~6 days).
        </p>
        <ul className="list-disc pl-6 text-slate-700 space-y-1 mb-3">
          <li>
            <strong>Features:</strong> rolling 5-epoch stats — skip-rate
            mean/std/trend, vote-latency mean/drift, credits mean,
            recent-delinquent flag, stake-change pct; static — commission, MEV
            commission, data-center / ASN / country concentration, stake
            percentile.
          </li>
          <li>
            <strong>Training:</strong> walk-forward across all available target
            epochs; eval = the most recent 30. Held-out AUC ≥ 0.75 is the
            target once history accumulates.
          </li>
          <li>
            <strong>Output:</strong> <code>downtime_prob_7d</code> ∈ [0, 1].
            Lower is better.
          </li>
        </ul>
        <div className="text-sm text-slate-500 italic">
          Honest disclosure: at hackathon launch the cron has accumulated only
          ~5 epochs of skip-rate history, which is too thin for a strong AUC.
          The classifier retrains every refresh and improves automatically as
          history extends.
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-3 text-blue-700">2. MEV tax</h2>
        <p className="text-slate-700 mb-3">
          The fraction of MEV revenue a validator keeps for themselves rather
          than passing back to delegators. Read directly from Jito's public
          API as <code>mev_commission_bps / 10000</code>; non-Jito validators
          are assigned a 10% opportunity-cost floor (since their delegators
          forgo MEV entirely).
        </p>
        <ul className="list-disc pl-6 text-slate-700 space-y-1 mb-3">
          <li>
            <strong>Output:</strong> <code>mev_tax_rate</code> ∈ [0, 1]. Lower
            is better.
          </li>
          <li>
            <strong>Future:</strong> when sufficient per-epoch MEV history is
            available, replace deterministic-fallback with a LightGBM regressor
            on actual rewards distributed.
          </li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-3 text-emerald-700">
          3. Decentralization
        </h2>
        <p className="text-slate-700 mb-3">
          Validators that share a data-center, ASN, or country with many others
          increase systemic correlated-failure risk and reduce the network's
          Nakamoto coefficient. Validators in the top-30 by stake are flagged
          as superminority candidates and penalized.
        </p>
        <ul className="list-disc pl-6 text-slate-700 space-y-1 mb-3">
          <li>
            For each cluster column (data center, ASN, country), score = 1 −
            rank-percent of cluster size. Validators in rare clusters score
            higher.
          </li>
          <li>
            Rule-based, not learned. Transparent and auditable.
          </li>
          <li>
            <strong>Output:</strong> <code>decentralization_score</code> ∈ [0,
            1]. Higher is better.
          </li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-3">Composite</h2>
        <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-sm">
          {`composite = 0.5 * (1 - downtime_prob_7d)
          + 0.3 * (1 - mev_tax_rate)
          + 0.2 * decentralization_score`}
        </pre>
        <p className="text-slate-700 mt-3">
          The 0.5 / 0.3 / 0.2 weights reflect a delegator-centric view: avoiding
          downtime is the highest cost, MEV tax the next leakage,
          decentralization a directional bonus. <strong>Weights are not
          learned</strong> — they're a transparent default. Different
          delegators will rank validators differently. Sort by any pillar
          individually on the{" "}
          <Link
            href="/validators"
            className="text-blue-600 hover:underline"
          >
            validators page
          </Link>
          .
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-3">Data sources</h2>
        <table className="w-full border rounded-lg overflow-hidden text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="text-left p-3">Source</th>
              <th className="text-left p-3">Frequency</th>
              <th className="text-left p-3">Used for</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t">
              <td className="p-3">Solana RPC (Helius)</td>
              <td className="p-3">2× / day</td>
              <td className="p-3">Validator list, identity↔vote mapping, stake, epoch credits</td>
            </tr>
            <tr className="border-t">
              <td className="p-3">getBlockProduction</td>
              <td className="p-3">2× / day</td>
              <td className="p-3">Current-epoch skip rate per validator</td>
            </tr>
            <tr className="border-t">
              <td className="p-3">Jito Kobe API</td>
              <td className="p-3">2× / day</td>
              <td className="p-3">MEV commission per Jito-running validator</td>
            </tr>
            <tr className="border-t">
              <td className="p-3">validators.app</td>
              <td className="p-3">2× / day (when token configured)</td>
              <td className="p-3">Data center, ASN, country, validator name</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-3">Reproducibility</h2>
        <p className="text-slate-700 mb-3">
          Everything is open-source under MIT. Read the code, run it locally,
          re-derive the scores yourself.
        </p>
        <ul className="list-disc pl-6 text-slate-700 space-y-1">
          <li>
            <a
              href="https://github.com/mikejohnkurkeyerian-eng/stakesense"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              GitHub repo
            </a>
          </li>
          <li>
            <a
              href="https://github.com/mikejohnkurkeyerian-eng/stakesense/blob/main/MODEL_CARD.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Full MODEL_CARD with limitations
            </a>
          </li>
          <li>
            <a
              href={`${process.env.NEXT_PUBLIC_API_BASE}/docs`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              REST API (Swagger)
            </a>
          </li>
        </ul>
      </section>
    </main>
  );
}
