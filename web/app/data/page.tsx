import Link from "next/link";

export const metadata = {
  title: "Open Data — stakesense",
  description:
    "Daily CSV/JSON exports of validator predictions, catalog, and decentralization snapshots. CC-BY 4.0 — free to reuse with attribution.",
  alternates: { canonical: "/data" },
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "https://stakesense.onrender.com";

const exports_ = [
  {
    id: "predictions",
    title: "Predictions snapshot",
    description:
      "Latest composite + pillar predictions for every scored validator. The same data the dashboard reads.",
    formats: [
      { label: "CSV", url: `${API_BASE}/api/v1/export/predictions.csv` },
      { label: "JSON", url: `${API_BASE}/api/v1/export/predictions.json` },
    ],
    fields: [
      "vote_pubkey",
      "identity_pubkey",
      "name",
      "commission_pct",
      "active_stake",
      "data_center",
      "asn",
      "country",
      "composite_score",
      "downtime_prob_7d",
      "mev_tax_rate",
      "decentralization_score",
      "model_version",
      "prediction_date",
    ],
    refresh: "Twice daily",
  },
  {
    id: "validators",
    title: "Validator catalog",
    description:
      "Identity + metadata for every active mainnet validator (no predictions). Useful as a lookup table.",
    formats: [
      { label: "CSV", url: `${API_BASE}/api/v1/export/validators.csv` },
    ],
    fields: [
      "vote_pubkey",
      "identity_pubkey",
      "name",
      "commission_pct",
      "active_stake",
      "mev_commission_pct",
      "jito_client",
      "data_center",
      "asn",
      "country",
      "first_seen_epoch",
      "last_updated",
    ],
    refresh: "Twice daily",
  },
  {
    id: "decentralization",
    title: "Decentralization snapshot",
    description:
      "Network-level Nakamoto coefficient + cluster breakdowns by data center, ASN, and country.",
    formats: [
      {
        label: "JSON",
        url: `${API_BASE}/api/v1/export/decentralization.json`,
      },
    ],
    fields: [
      "nakamoto_coefficient",
      "total_stake",
      "clusters.data_center[]",
      "clusters.asn[]",
      "clusters.country[]",
    ],
    refresh: "Twice daily",
  },
];

export default function DataPage() {
  return (
    <main className="container mx-auto px-6 py-12 max-w-4xl">
      <Link
        href="/"
        className="text-sm text-slate-500 hover:text-slate-900 mb-4 inline-block"
      >
        ← Home
      </Link>
      <h1 className="text-4xl font-bold mb-3">Open data</h1>
      <p className="text-slate-600 mb-3 text-lg">
        Daily snapshots of every prediction, validator, and concentration
        metric stakesense produces — free to download, free to reuse.
      </p>
      <p className="text-slate-500 mb-10 text-sm">
        Released under{" "}
        <a
          href="https://creativecommons.org/licenses/by/4.0/"
          className="text-violet-700 underline"
        >
          Creative Commons BY 4.0
        </a>
        . Attribution to{" "}
        <code className="bg-slate-100 px-1.5 py-0.5 rounded">stakesense</code>{" "}
        is appreciated.
      </p>

      <section className="mb-10 bg-violet-50 border border-violet-200 rounded-lg p-5">
        <h2 className="text-lg font-bold text-violet-900 mb-2">
          Quick attribution snippet
        </h2>
        <pre className="bg-white border rounded p-3 text-sm overflow-x-auto">
          {`Data: stakesense (https://github.com/mikejohnkurkeyerian-eng/stakesense), CC-BY 4.0`}
        </pre>
        <p className="text-sm text-violet-900 mt-2">
          Or use a markdown line: <code>[stakesense](https://...) — CC-BY 4.0</code>
        </p>
      </section>

      {exports_.map((ex) => (
        <section key={ex.id} className="mb-10 border rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-2 text-slate-900">{ex.title}</h2>
          <p className="text-slate-700 mb-4">{ex.description}</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {ex.formats.map((f) => (
              <a
                key={f.url}
                href={f.url}
                className="inline-flex items-center px-4 py-2 bg-slate-900 text-white rounded hover:bg-slate-700 text-sm font-medium"
                download
              >
                Download {f.label}
              </a>
            ))}
            <span className="inline-flex items-center px-3 py-2 bg-slate-100 text-slate-700 rounded text-xs">
              {ex.refresh}
            </span>
          </div>
          <details className="text-sm text-slate-700">
            <summary className="cursor-pointer text-violet-700 hover:underline">
              Schema ({ex.fields.length} fields)
            </summary>
            <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
              {ex.fields.map((f) => (
                <li key={f}>
                  <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                    {f}
                  </code>
                </li>
              ))}
            </ul>
          </details>
        </section>
      ))}

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-3 text-violet-700">
          Programmatic access
        </h2>
        <p className="text-slate-700 mb-3">
          Every export has a stable URL. The manifest at{" "}
          <a
            href={`${API_BASE}/api/v1/export/manifest.json`}
            className="text-violet-700 underline"
          >
            /api/v1/export/manifest.json
          </a>{" "}
          self-describes the available datasets — useful for research scrapers,
          MCP servers, and AI agents.
        </p>
        <pre className="bg-slate-900 text-slate-100 rounded p-4 text-sm overflow-x-auto">
{`# curl
curl -O ${API_BASE}/api/v1/export/predictions.csv

# Python
import pandas as pd
df = pd.read_csv("${API_BASE}/api/v1/export/predictions.csv", comment="#")

# JS / Node
const r = await fetch("${API_BASE}/api/v1/export/predictions.json");
const { rows } = await r.json();`}
        </pre>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-3 text-violet-700">
          MCP server
        </h2>
        <p className="text-slate-700 mb-3">
          For Claude Desktop, Claude Code, and Cursor, the same data is
          available as native MCP tools. Install with one command:
        </p>
        <pre className="bg-slate-900 text-slate-100 rounded p-4 text-sm overflow-x-auto">
{`claude mcp add stakesense -- npx stakesense-mcp`}
        </pre>
        <p className="text-slate-500 text-sm mt-2">
          See{" "}
          <Link
            href="/integrations/mcp"
            className="text-violet-700 underline"
          >
            /integrations/mcp
          </Link>{" "}
          for the full integration guide.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-3 text-violet-700">
          Embeddable widget
        </h2>
        <p className="text-slate-700 mb-3">
          Drop a stakesense badge on any Solana site:
        </p>
        <pre className="bg-slate-900 text-slate-100 rounded p-4 text-sm overflow-x-auto">
{`<script src="${API_BASE.replace("https://stakesense.onrender.com", "https://stakesense-el77-git-main-california-mortgage-solutions.vercel.app")}/widget.js" async></script>
<div data-stakesense-validator="VOTE_PUBKEY"></div>`}
        </pre>
        <p className="text-slate-500 text-sm mt-2">
          Themes, sizes, and modes documented at <Link href="/widget" className="text-violet-700 underline">/widget</Link>.
        </p>
      </section>

      <section className="text-sm text-slate-500 border-t pt-6">
        <strong>Caveats:</strong> Data refreshes twice daily. For real-time
        querying, use the{" "}
        <a
          href={`${API_BASE}/docs`}
          className="text-violet-700 underline"
        >
          REST API
        </a>{" "}
        instead. Predictions are not investment advice.
      </section>
    </main>
  );
}
