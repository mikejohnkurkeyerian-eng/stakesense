import Link from "next/link";

export const metadata = {
  title: "Changelog — stakesense",
  description:
    "Public changelog tracking every shipped feature in the stakesense build, from monorepo skeleton to MCP server.",
  alternates: { canonical: "/changelog" },
};

const ENTRIES: { tag: string; date: string; bullets: string[] }[] = [
  {
    tag: "0.4.0",
    date: "2026-05-04 — finishing-sprint Day 5+",
    bullets: [
      "/operator/[vote_pubkey] dashboard with rank, percentile, gap to top-10/50",
      "/api/v1/validators/{pk}/rank endpoint",
      "/alerts page + /api/v1/anomalies — MEV jumps, newly delinquent, score movers",
      "/research page with live decentralization stats",
      "/sponsors page — 12-sponsor public attribution",
      "/stake/multisig — generic multisig stake-tx generator (Squads-compatible)",
      "MCP server expanded to 10 tools (added get_validator_rank, get_recent_anomalies)",
      "Validator detail: composite score breakdown with weighted bars",
      "Landing page: 'more ways to use' surface grid",
      "13 new tests (43 api + 15 mcp = 58 total)",
    ],
  },
  {
    tag: "0.3.0",
    date: "2026-05-04 — finishing-sprint Day 4",
    bullets: [
      "Embeddable widget at /widget — vanilla JS, no deps",
      "Themes (light/dark), sizes (full/compact), self-hosted backend support",
      "Live tabbed preview on /widget showcase",
    ],
  },
  {
    tag: "0.2.0",
    date: "2026-05-04 — finishing-sprint Day 3",
    bullets: [
      "Portfolio analyzer — /api/v1/portfolio/{owner_pubkey}",
      "/portfolio page with wallet auto-fill + concentration analysis",
      "Stake-weighted composite, downtime, MEV, decentralization",
      "Concentration buckets + risk warnings + rebalance suggestions",
      "9 portfolio scoring tests + 4 portfolio integration tests",
    ],
  },
  {
    tag: "0.1.0",
    date: "2026-05-04 — finishing-sprint Days 1–2",
    bullets: [
      "Submission packet (docs/SUBMISSION, DEMO_SCRIPT, METHODOLOGY)",
      "/about page, /data page, sponsor bounty drafts",
      "Open-data exports: predictions.csv/json, validators.csv, decentralization.json, manifest.json",
      "JSON-LD enriched with Dataset + Organization schemas",
      "Privy email/social login on /stake (dynamically loaded)",
      "stakesense-mcp on npm: 8 tools, 5 resources, /integrations/mcp page",
      "README rewrite (mermaid arch diagram, FAQ, sponsor table)",
      "CHANGELOG, CONTRIBUTING, SECURITY, PWA manifest, security.txt",
    ],
  },
  {
    tag: "0.0.1",
    date: "2026-04-29 — initial build",
    bullets: [
      "FastAPI backend + Next.js dashboard + Postgres on Supabase",
      "GitHub Actions cron 2x/day (refresh + retrain + predict)",
      "Phantom wallet stake flow on /stake",
      "8 frontend pages (landing, validators, validator detail, /compare, /backtest, /methodology, /stake, errors)",
      "LightGBM downtime classifier + MEV regressor + decentralization scorer",
      "Backtest engine + composite scoring",
      "Nakamoto coefficient surfaced",
      "OG image, sitemap, robots.txt",
    ],
  },
  {
    tag: "0.0.0",
    date: "2026-04-28 — repo init",
    bullets: [
      "Monorepo skeleton (api + web + docs)",
      "MIT license, design spec, 14-day implementation plan",
      "Solana RPC client (getVoteAccounts) + first test fixture",
      "Python venv + FastAPI scaffold + Next.js 16 scaffold",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <main className="container mx-auto px-6 py-12 max-w-3xl">
      <Link
        href="/"
        className="text-sm text-slate-500 hover:text-slate-900 mb-4 inline-block"
      >
        ← Home
      </Link>
      <h1 className="text-4xl font-bold mb-3">Changelog</h1>
      <p className="text-slate-600 mb-3 text-lg">
        From <code className="bg-slate-100 px-1.5 py-0.5 rounded">git init</code>{" "}
        to public-goods validator oracle. Every shipped feature in order.
      </p>
      <p className="text-slate-500 text-sm mb-10">
        Roughly 70+ commits across 6 calendar days. Solo. See{" "}
        <a
          href="https://github.com/mikejohnkurkeyerian-eng/stakesense/commits/main"
          className="text-violet-700 underline"
        >
          full git history
        </a>
        .
      </p>

      <ol className="space-y-8 border-l-2 border-violet-200 pl-6">
        {ENTRIES.map((e) => (
          <li key={e.tag} className="relative">
            <span className="absolute -left-[34px] top-1 w-4 h-4 rounded-full bg-violet-500 border-4 border-white" />
            <div className="flex items-baseline gap-3 mb-2">
              <code className="text-sm font-bold bg-violet-100 text-violet-900 px-2 py-0.5 rounded">
                {e.tag}
              </code>
              <span className="text-xs text-slate-500">{e.date}</span>
            </div>
            <ul className="text-sm text-slate-700 space-y-1 list-disc pl-5">
              {e.bullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>

      <section className="text-sm text-slate-500 border-t pt-6 mt-12">
        <p>
          Source-of-truth changelog at{" "}
          <a
            href="https://github.com/mikejohnkurkeyerian-eng/stakesense/blob/main/CHANGELOG.md"
            className="text-violet-700 underline"
          >
            CHANGELOG.md
          </a>
          .
        </p>
      </section>
    </main>
  );
}
