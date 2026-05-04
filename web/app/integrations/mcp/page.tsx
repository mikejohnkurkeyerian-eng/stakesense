import Link from "next/link";

export const metadata = {
  title: "MCP integration — stakesense",
  description:
    "Install stakesense as an MCP server in Claude Desktop, Claude Code, or Cursor. Predictive Solana validator data accessible to any LLM agent.",
  alternates: { canonical: "/integrations/mcp" },
};

const TOOLS = [
  {
    name: "get_validator_score",
    purpose: "Pillar + composite scores for one validator",
  },
  {
    name: "recommend_top_validators",
    purpose: "Where should I stake N SOL?",
  },
  {
    name: "list_validators",
    purpose: "Browse top of any pillar",
  },
  {
    name: "get_validator_history",
    purpose: "Score trajectory over time",
  },
  {
    name: "get_validator_rank",
    purpose: "Where this validator ranks + gap to top-10",
  },
  {
    name: "get_decentralization_report",
    purpose: "Network Nakamoto coefficient + clusters",
  },
  {
    name: "get_concentration_by",
    purpose: "Top clusters along data_center / asn / country",
  },
  {
    name: "get_network_stats",
    purpose: "Global averages + latest epoch",
  },
  {
    name: "get_recent_anomalies",
    purpose: "What changed in the validator set this week",
  },
  {
    name: "health_check",
    purpose: "API liveness + freshness",
  },
];

const RESOURCES = [
  {
    uri: "stakesense://methodology",
    purpose: "Long-form methodology paper",
  },
  {
    uri: "stakesense://model-card",
    purpose: "Technical model documentation",
  },
  {
    uri: "stakesense://manifest",
    purpose: "Open-data export manifest",
  },
  {
    uri: "stakesense://network-stats",
    purpose: "Latest network stats snapshot",
  },
  {
    uri: "stakesense://decentralization",
    purpose: "Concentration breakdown snapshot",
  },
];

export default function McpPage() {
  return (
    <main className="container mx-auto px-6 py-12 max-w-4xl">
      <Link
        href="/"
        className="text-sm text-slate-500 hover:text-slate-900 mb-4 inline-block"
      >
        ← Home
      </Link>

      <div className="flex items-center gap-3 mb-3">
        <h1 className="text-4xl font-bold">MCP integration</h1>
        <span className="px-2.5 py-1 rounded-full bg-violet-100 text-violet-900 text-xs font-bold">
          Public Goods
        </span>
      </div>
      <p className="text-slate-600 mb-3 text-lg">
        Stakesense ships as a Model Context Protocol server. Claude Desktop,
        Claude Code, Cursor, and any MCP-compatible LLM agent can natively
        query predictive Solana validator data — no custom plumbing needed.
      </p>
      <p className="text-slate-500 mb-10 text-sm">
        Package:{" "}
        <a
          href="https://www.npmjs.com/package/stakesense-mcp"
          className="text-violet-700 underline"
        >
          stakesense-mcp
        </a>{" "}
        on npm · MIT-licensed code · CC-BY 4.0 data
      </p>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-3 text-violet-700">
          Install in Claude
        </h2>
        <p className="text-slate-700 mb-3">
          One command:
        </p>
        <pre className="bg-slate-900 text-slate-100 rounded p-4 text-sm overflow-x-auto">
{`claude mcp add stakesense -- npx stakesense-mcp`}
        </pre>
        <p className="text-slate-500 text-sm mt-2">
          Restart Claude. Ask:{" "}
          <em className="text-slate-700">
            &quot;Which Solana validators have the lowest predicted downtime
            risk?&quot;
          </em>
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-3 text-violet-700">
          Install in Cursor / Windsurf
        </h2>
        <p className="text-slate-700 mb-3">
          Add to your MCP config (Settings → MCP, or{" "}
          <code className="bg-slate-100 px-1.5 py-0.5 rounded">
            ~/.cursor/mcp.json
          </code>
          ):
        </p>
        <pre className="bg-slate-900 text-slate-100 rounded p-4 text-sm overflow-x-auto">
{`{
  "mcpServers": {
    "stakesense": {
      "command": "npx",
      "args": ["-y", "stakesense-mcp"]
    }
  }
}`}
        </pre>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-3 text-violet-700">
          Tools your agent gets
        </h2>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Tool</th>
                <th className="text-left px-4 py-2 font-medium">Purpose</th>
              </tr>
            </thead>
            <tbody>
              {TOOLS.map((t) => (
                <tr key={t.name} className="border-t">
                  <td className="px-4 py-2">
                    <code className="text-violet-700 font-mono text-xs">
                      {t.name}
                    </code>
                  </td>
                  <td className="px-4 py-2 text-slate-700">{t.purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-3 text-violet-700">
          Resources your agent can read
        </h2>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="text-left px-4 py-2 font-medium">URI</th>
                <th className="text-left px-4 py-2 font-medium">Contents</th>
              </tr>
            </thead>
            <tbody>
              {RESOURCES.map((r) => (
                <tr key={r.uri} className="border-t">
                  <td className="px-4 py-2">
                    <code className="text-violet-700 font-mono text-xs">
                      {r.uri}
                    </code>
                  </td>
                  <td className="px-4 py-2 text-slate-700">{r.purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-3 text-violet-700">
          Example prompts
        </h2>
        <ul className="space-y-3 text-slate-700">
          <li className="border-l-2 border-violet-300 pl-4">
            <em>
              &quot;List the top 5 Solana validators by composite score and
              explain why each one ranks high.&quot;
            </em>
          </li>
          <li className="border-l-2 border-violet-300 pl-4">
            <em>
              &quot;I have 100 SOL to stake — pick three validators for a
              balanced risk profile.&quot;
            </em>
          </li>
          <li className="border-l-2 border-violet-300 pl-4">
            <em>
              &quot;What&apos;s Solana&apos;s current Nakamoto coefficient,
              and which data centers host the most validators?&quot;
            </em>
          </li>
          <li className="border-l-2 border-violet-300 pl-4">
            <em>
              &quot;Show me the prediction history for{" "}
              <span className="font-mono text-xs">[vote_pubkey]</span> over the
              last 30 days. Is it trending up or down?&quot;
            </em>
          </li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-3 text-violet-700">
          Why this is a public good
        </h2>
        <p className="text-slate-700">
          The same predictive scoring data the dashboard surfaces is now
          available to every LLM agent that speaks MCP — Claude, Cursor, and
          any future model that adopts the standard. Stakesense becomes a
          shared substrate that wallets, dashboards, and AI assistants can all
          build on without owning their own data pipeline. That&apos;s the
          public-goods thesis: validator quality data benefits Solana most
          when it&apos;s open and uniform across all consumers.
        </p>
      </section>

      <section className="text-sm text-slate-500 border-t pt-6">
        Source code:{" "}
        <a
          href="https://github.com/mikejohnkurkeyerian-eng/stakesense/tree/main/mcp"
          className="text-violet-700 underline"
        >
          github.com/mikejohnkurkeyerian-eng/stakesense/mcp
        </a>
        . Bug? Idea?{" "}
        <a
          href="https://github.com/mikejohnkurkeyerian-eng/stakesense/issues"
          className="text-violet-700 underline"
        >
          Open an issue
        </a>
        .
      </section>
    </main>
  );
}
