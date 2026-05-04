import Link from "next/link";

import WidgetPreview from "./WidgetPreview";

export const metadata = {
  title: "Embeddable widget — stakesense",
  description:
    "Drop a stakesense validator score onto any Solana site with a single <script> tag. CC-BY 4.0 data, no API key needed.",
  alternates: { canonical: "/widget" },
};

const SITE =
  "https://stakesense-el77-git-main-california-mortgage-solutions.vercel.app";

export default function WidgetPage() {
  return (
    <main className="container mx-auto px-6 py-12 max-w-4xl">
      <Link
        href="/"
        className="text-sm text-slate-500 hover:text-slate-900 mb-4 inline-block"
      >
        ← Home
      </Link>
      <h1 className="text-4xl font-bold mb-3">Embeddable widget</h1>
      <p className="text-slate-600 mb-3 text-lg">
        Drop a live stakesense score on any Solana site with one{" "}
        <code className="bg-slate-100 px-1.5 py-0.5 rounded">
          &lt;script&gt;
        </code>
        . No API key, no rate limit headache, no React.
      </p>
      <p className="text-slate-500 text-sm mb-10">
        MIT-licensed code · CC-BY 4.0 data · attribution to{" "}
        <code className="bg-slate-100 px-1 py-0.5 rounded">stakesense</code>{" "}
        appreciated
      </p>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-3 text-violet-700">
          Quick start
        </h2>
        <p className="text-slate-700 mb-3">
          Paste this into any HTML page:
        </p>
        <pre className="bg-slate-900 text-slate-100 rounded p-4 text-sm overflow-x-auto">
{`<script src="${SITE}/widget.js" async></script>

<!-- single validator -->
<div data-stakesense-validator="VOTE_PUBKEY"></div>

<!-- top-N -->
<div data-stakesense-top="5"></div>`}
        </pre>
        <p className="text-slate-500 text-sm mt-2">
          The widget mounts automatically on{" "}
          <code className="bg-slate-100 px-1 py-0.5 rounded text-xs">
            DOMContentLoaded
          </code>
          . For SPAs that mount nodes later, call{" "}
          <code className="bg-slate-100 px-1 py-0.5 rounded text-xs">
            window.stakesense.mount(container)
          </code>{" "}
          after render.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-3 text-violet-700">Live preview</h2>
        <WidgetPreview />
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-3 text-violet-700">Options</h2>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Attribute</th>
                <th className="text-left px-4 py-2 font-medium">Values</th>
                <th className="text-left px-4 py-2 font-medium">Effect</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t">
                <td className="px-4 py-2">
                  <code className="text-xs">data-stakesense-validator</code>
                </td>
                <td className="px-4 py-2 text-slate-600 text-xs">vote pubkey</td>
                <td className="px-4 py-2 text-slate-700">
                  Render score card for one validator
                </td>
              </tr>
              <tr className="border-t">
                <td className="px-4 py-2">
                  <code className="text-xs">data-stakesense-top</code>
                </td>
                <td className="px-4 py-2 text-slate-600 text-xs">1–20</td>
                <td className="px-4 py-2 text-slate-700">
                  Render top-N list by composite score
                </td>
              </tr>
              <tr className="border-t">
                <td className="px-4 py-2">
                  <code className="text-xs">data-stakesense-theme</code>
                </td>
                <td className="px-4 py-2 text-slate-600 text-xs">
                  light | dark
                </td>
                <td className="px-4 py-2 text-slate-700">
                  Color theme (default: light)
                </td>
              </tr>
              <tr className="border-t">
                <td className="px-4 py-2">
                  <code className="text-xs">data-stakesense-size</code>
                </td>
                <td className="px-4 py-2 text-slate-600 text-xs">
                  full | compact
                </td>
                <td className="px-4 py-2 text-slate-700">
                  Compact hides pillar breakdown (single-validator only)
                </td>
              </tr>
              <tr className="border-t">
                <td className="px-4 py-2">
                  <code className="text-xs">data-stakesense-api</code>
                </td>
                <td className="px-4 py-2 text-slate-600 text-xs">URL</td>
                <td className="px-4 py-2 text-slate-700">
                  Override API base for self-hosted backends
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-3 text-violet-700">Examples</h2>
        <div className="space-y-4">
          <Example
            label="Top 3, dark theme"
            code='<div data-stakesense-top="3" data-stakesense-theme="dark"></div>'
          />
          <Example
            label="Compact single validator"
            code='<div data-stakesense-validator="VOTE_PUBKEY" data-stakesense-size="compact"></div>'
          />
          <Example
            label="Self-hosted backend"
            code='<div data-stakesense-validator="VOTE_PUBKEY" data-stakesense-api="https://your-api.example.com"></div>'
          />
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-3 text-violet-700">Why ship this?</h2>
        <p className="text-slate-700">
          Validator quality data is most useful when it&apos;s everywhere. Any
          Solana wallet, dashboard, DAO admin panel, or staking client that
          embeds the widget gives its users a transparent quality signal at
          the moment of decision — and shares the load of the public-goods
          dataset across more consumers. We treat the widget as a distribution
          surface for the open data, not a moat.
        </p>
      </section>

      <section className="text-sm text-slate-500 border-t pt-6">
        Source code:{" "}
        <a
          href="https://github.com/mikejohnkurkeyerian-eng/stakesense/blob/main/web/public/widget.js"
          className="text-violet-700 underline"
        >
          widget.js on GitHub
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

function Example({ label, code }: { label: string; code: string }) {
  return (
    <div>
      <div className="text-xs font-medium text-slate-600 mb-1">{label}</div>
      <pre className="bg-slate-900 text-slate-100 rounded p-3 text-xs overflow-x-auto">
        {code}
      </pre>
    </div>
  );
}
