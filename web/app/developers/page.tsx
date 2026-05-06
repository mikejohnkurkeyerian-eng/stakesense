import Link from "next/link";

export const metadata = {
  title: "Developers — stakesense API",
  description:
    "Public REST API for predictive Solana validator scoring. Open OpenAPI 3.1 spec, Postman collection, MCP server, and embeddable widget.",
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "https://stakesense.onrender.com";

const QUICKSTART = [
  {
    title: "Get a single validator's score",
    code: `curl ${API_BASE}/api/v1/validators/{vote_pubkey}`,
  },
  {
    title: "Top 10 by composite",
    code: `curl '${API_BASE}/api/v1/validators?sort=composite&limit=10'`,
  },
  {
    title: "Recommend where to stake 100 SOL",
    code: `curl -X POST ${API_BASE}/api/v1/recommend \\
  -H 'content-type: application/json' \\
  -d '{"amount_sol": 100, "risk_profile": "balanced", "count": 5}'`,
  },
  {
    title: "What-if rebalance",
    code: `curl -X POST ${API_BASE}/api/v1/simulate \\
  -H 'content-type: application/json' \\
  -d '{
    "before": [{"voter_pubkey": "AAA...", "sol": 100}],
    "after":  [{"voter_pubkey": "BBB...", "sol": 100}]
  }'`,
  },
  {
    title: "Network-wide decentralization snapshot",
    code: `curl ${API_BASE}/api/v1/export/decentralization.json`,
  },
];

export default function DevelopersPage() {
  return (
    <main className="container mx-auto px-6 py-12 max-w-4xl">
      <Link
        href="/"
        className="text-sm text-slate-500 hover:text-slate-900 mb-4 inline-block"
      >
        ← Home
      </Link>
      <h1 className="text-4xl font-bold mb-3">Developers</h1>
      <p className="text-slate-600 mb-8 text-lg">
        Public REST API, MCP server, embeddable widget, daily CSV/JSON exports.
        No keys. No rate-card. CC-BY 4.0 on the data.
      </p>

      <section className="grid sm:grid-cols-2 gap-3 mb-10">
        <DownloadCard
          title="OpenAPI 3.1 spec"
          desc="Machine-readable API schema. Drop into Swagger UI or Insomnia."
          href={`${API_BASE}/api/v1/openapi.json`}
        />
        <DownloadCard
          title="Postman collection"
          desc="Import directly: Postman → Import → Link → paste."
          href={`${API_BASE}/api/v1/postman.json`}
        />
        <DownloadCard
          title="Predictions CSV"
          desc="Today's scoring rows for every validator."
          href={`${API_BASE}/api/v1/export/predictions.csv`}
        />
        <DownloadCard
          title="Validators CSV"
          desc="Validator catalog with metadata + commission."
          href={`${API_BASE}/api/v1/export/validators.csv`}
        />
        <DownloadCard
          title="Export manifest"
          desc="Every dataset with schema + refresh cadence."
          href={`${API_BASE}/api/v1/export/manifest.json`}
        />
        <DownloadCard
          title="Decentralization snapshot"
          desc="Nakamoto coefficient + cluster breakdowns."
          href={`${API_BASE}/api/v1/export/decentralization.json`}
        />
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Quickstart</h2>
        <div className="space-y-4">
          {QUICKSTART.map((q) => (
            <div key={q.title}>
              <div className="text-sm font-semibold text-slate-700 mb-1">
                {q.title}
              </div>
              <pre className="bg-slate-900 text-slate-100 text-xs p-4 rounded overflow-x-auto">
                <code>{q.code}</code>
              </pre>
            </div>
          ))}
        </div>
      </section>

      <section className="grid sm:grid-cols-3 gap-3 mb-10">
        <CardLink
          href="/integrations/mcp"
          title="MCP server"
          desc="Claude / Cursor query stakesense natively"
        />
        <CardLink
          href="/widget"
          title="Embeddable widget"
          desc="Drop a score on any site with one <script>"
        />
        <CardLink
          href="/playground"
          title="API playground"
          desc="Interactive endpoint explorer in your browser"
        />
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Terms</h2>
        <ul className="space-y-2 text-sm text-slate-700">
          <li>
            <strong>Code:</strong> MIT license. The whole repo, including this site.
          </li>
          <li>
            <strong>Data:</strong> CC-BY 4.0. Reuse freely; just credit
            &quot;stakesense&quot; with a link back.
          </li>
          <li>
            <strong>Rate limit:</strong> 60 req/min/IP today. Need more?
            <a
              href="https://github.com/mikejohnkurkeyerian-eng/stakesense/issues/new"
              className="text-violet-700 underline ml-1"
            >
              open an issue
            </a>
            .
          </li>
        </ul>
      </section>
    </main>
  );
}

function DownloadCard({
  title,
  desc,
  href,
}: {
  title: string;
  desc: string;
  href: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      className="border rounded-lg p-4 bg-white hover:border-violet-400 transition-colors block"
    >
      <div className="font-semibold mb-1">{title} ↗</div>
      <div className="text-xs text-slate-600">{desc}</div>
    </a>
  );
}

function CardLink({
  href,
  title,
  desc,
}: {
  href: string;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="border rounded-lg p-4 bg-white hover:border-violet-400 transition-colors block"
    >
      <div className="font-semibold mb-1">{title} →</div>
      <div className="text-xs text-slate-600">{desc}</div>
    </Link>
  );
}
