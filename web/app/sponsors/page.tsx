import Link from "next/link";

export const metadata = {
  title: "Sponsors — stakesense",
  description:
    "How stakesense uses Phantom, Privy, the Solana Foundation, Squads, and the Colosseum cohort to ship a public-goods validator oracle.",
  alternates: { canonical: "/sponsors" },
};

const SPONSORS = [
  {
    name: "Phantom",
    url: "https://phantom.app",
    role: "Wallet integration",
    summary:
      "Powers the one-click stake flow on /stake. Wallet-adapter-react binding lets users connect, see recommended validators, and delegate without leaving the dashboard.",
    surfaces: ["/stake", "/portfolio (auto-fill from connected wallet)"],
  },
  {
    name: "Privy",
    url: "https://privy.io",
    role: "Email / social / embedded wallet",
    summary:
      "Alternative login on /stake — users without a Solana wallet can sign up with email or Google and Privy generates a Solana embedded wallet. Coexists with Phantom.",
    surfaces: ["/stake (Email/Social login button)"],
  },
  {
    name: "Solana Foundation",
    url: "https://solana.org",
    role: "Mission alignment / Public Goods track",
    summary:
      "Stakesense is built for the Solana Foundation's Public Goods tier. Decentralization-first scoring (Nakamoto coefficient on every page), open methodology, CC-BY 4.0 data — designed to broaden access to validator quality data across the ecosystem.",
    surfaces: ["/research", "/data", "/api/v1/export/*"],
  },
  {
    name: "Squads",
    url: "https://squads.so",
    role: "DAO multisig staking",
    summary:
      "/portfolio works with any wallet pubkey — including Squads vault PDAs — so DAO operators can analyze treasury risk today. Full /stake/dao multisig flow with V4 SDK is on the post-hackathon roadmap.",
    surfaces: ["/portfolio (DAO vault analysis)"],
  },
  {
    name: "Helius",
    url: "https://helius.dev",
    role: "Solana RPC infrastructure",
    summary:
      "Free-tier RPC powers every cron run. getVoteAccounts and getBlockProduction enumerate validators and skip rates; getProgramAccounts pulls portfolio stake-account data.",
    surfaces: ["Backend (refresh_all.py, portfolio analyzer)"],
  },
  {
    name: "Jito",
    url: "https://jito.network",
    role: "MEV commission data",
    summary:
      "Jito Kobe API provides per-validator MEV commission, the input to the MEV-tax pillar.",
    surfaces: ["Backend (mev_observations table, train_mev_tax.py)"],
  },
  {
    name: "validators.app",
    url: "https://www.validators.app",
    role: "Geographic + hosting metadata",
    summary:
      "Source of data_center, ASN, and country fields. Decentralization scoring depends entirely on this data; we strongly encourage validators to register there.",
    surfaces: ["Backend (enrich_metadata.py, decentralization scorer)"],
  },
  {
    name: "Vercel",
    url: "https://vercel.com",
    role: "Frontend hosting",
    summary:
      "Hosts the Next.js dashboard. ISR + edge cache makes the dashboard fast and free at hackathon scale.",
    surfaces: ["Frontend (web/)"],
  },
  {
    name: "Render",
    url: "https://render.com",
    role: "API hosting",
    summary:
      "Hosts the FastAPI service via render.yaml blueprint. Free tier means stakesense costs $0 to run.",
    surfaces: ["Backend (api/)"],
  },
  {
    name: "Supabase",
    url: "https://supabase.com",
    role: "Postgres",
    summary:
      "Hosts the live database (validators, epoch_performance, mev_observations, predictions). Session pooler gives DDL-friendly connection.",
    surfaces: ["Backend (db/)"],
  },
  {
    name: "Anthropic",
    url: "https://anthropic.com",
    role: "MCP target / build assistant",
    summary:
      "stakesense-mcp implements the Model Context Protocol so Claude Desktop, Claude Code, and Cursor can natively query validator quality. Claude Code was also the build assistant for this hackathon entry.",
    surfaces: ["mcp/", "/integrations/mcp"],
  },
  {
    name: "Colosseum",
    url: "https://colosseum.com/frontier",
    role: "Hackathon host",
    summary:
      "Solana Frontier 2026 is where stakesense lives. The 14-day timeline and the Public Goods track shaped the open-data, open-source-first design.",
    surfaces: ["docs/SUBMISSION.md"],
  },
];

export default function SponsorsPage() {
  return (
    <main className="container mx-auto px-6 py-12 max-w-4xl">
      <Link
        href="/"
        className="text-sm text-slate-500 hover:text-slate-900 mb-4 inline-block"
      >
        ← Home
      </Link>
      <h1 className="text-4xl font-bold mb-3">Sponsors &amp; collaborators</h1>
      <p className="text-slate-600 mb-3 text-lg">
        Stakesense is solo-built but the surfaces it ships ride on others&apos;
        infrastructure. This page is the public attribution.
      </p>
      <p className="text-slate-500 text-sm mb-10">
        Each sponsor below has either a direct integration in the codebase or
        provides hosting/data we depend on. Mention here is not an endorsement
        from the sponsor.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
        {SPONSORS.map((s) => (
          <div
            key={s.name}
            className="border rounded-lg p-5 bg-white"
          >
            <div className="flex items-start justify-between mb-2">
              <a
                href={s.url}
                target="_blank"
                rel="noopener"
                className="font-bold text-lg text-slate-900 hover:text-violet-700"
              >
                {s.name} ↗
              </a>
              <span className="text-xs text-slate-500 bg-slate-100 rounded px-2 py-0.5">
                {s.role}
              </span>
            </div>
            <p className="text-sm text-slate-700 mb-3">{s.summary}</p>
            {s.surfaces.length > 0 && (
              <div className="text-xs text-slate-500">
                Used in:{" "}
                {s.surfaces.map((surface, i) => (
                  <span key={surface}>
                    {i > 0 && ", "}
                    <code className="bg-slate-100 px-1 py-0.5 rounded">
                      {surface}
                    </code>
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <section className="text-sm text-slate-500 border-t pt-6 space-y-2">
        <p>
          Stakesense is open source. If you&apos;re a sponsor and want a
          deeper integration, the repo is at{" "}
          <a
            href="https://github.com/mikejohnkurkeyerian-eng/stakesense"
            className="text-violet-700 underline"
          >
            github.com/mikejohnkurkeyerian-eng/stakesense
          </a>
          . Open an issue or DM mikejohnkurkeyerian@gmail.com.
        </p>
      </section>
    </main>
  );
}
