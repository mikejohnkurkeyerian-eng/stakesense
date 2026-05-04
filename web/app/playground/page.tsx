"use client";

import Link from "next/link";
import { useState } from "react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "https://stakesense.onrender.com";

type Endpoint = {
  id: string;
  method: "GET" | "POST";
  path: string;
  description: string;
  body?: string;
  example?: string;
};

const ENDPOINTS: Endpoint[] = [
  {
    id: "health",
    method: "GET",
    path: "/api/v1/health",
    description:
      "Quick liveness + freshness ping. Returns last_update_epoch, last_prediction_date, model_version.",
  },
  {
    id: "stats",
    method: "GET",
    path: "/api/v1/validators/stats",
    description:
      "Network-level summary: averages, totals, latest epoch, Nakamoto coefficient.",
  },
  {
    id: "validators",
    method: "GET",
    path: "/api/v1/validators?limit=10&sort=composite",
    description:
      "Top validators by composite score (or downtime / mev_tax / decentralization).",
  },
  {
    id: "rank",
    method: "GET",
    path: "/api/v1/validators/5AC692spnjbegP7ttCXJEzUe8S81sLYsqJd8Ae6Zv1xU/rank",
    description:
      "Operator-side rank for one validator across every pillar + gap to top-10/50.",
  },
  {
    id: "predictions",
    method: "GET",
    path: "/api/v1/validators/5AC692spnjbegP7ttCXJEzUe8S81sLYsqJd8Ae6Zv1xU/predictions?limit=7",
    description: "Per-day prediction history for one validator.",
  },
  {
    id: "clusters",
    method: "GET",
    path: "/api/v1/validators/clusters?by=data_center&top=10",
    description:
      "Top cluster buckets along data_center / asn / country.",
  },
  {
    id: "anomalies",
    method: "GET",
    path: "/api/v1/anomalies?limit=10",
    description:
      "What changed recently — MEV jumps, newly delinquent, composite movers.",
  },
  {
    id: "decentralization-snapshot",
    method: "GET",
    path: "/api/v1/export/decentralization.json",
    description:
      "Full decentralization snapshot — Nakamoto + cluster breakdowns. CC-BY 4.0.",
  },
  {
    id: "manifest",
    method: "GET",
    path: "/api/v1/export/manifest.json",
    description:
      "Self-describing manifest of every public dataset stakesense publishes.",
  },
  {
    id: "recommend",
    method: "POST",
    path: "/api/v1/recommend",
    body: JSON.stringify(
      { amount_sol: 100, risk_profile: "balanced", count: 3 },
      null,
      2
    ),
    description:
      "Top-N validator recommendations for a given SOL amount and risk profile.",
  },
];

export default function PlaygroundPage() {
  const [active, setActive] = useState<string>("health");
  const [response, setResponse] = useState<string>("");
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ep = ENDPOINTS.find((e) => e.id === active)!;

  async function run() {
    setLoading(true);
    setError(null);
    setResponse("");
    setResponseStatus(null);
    try {
      const init: RequestInit = { method: ep.method };
      if (ep.method === "POST") {
        init.headers = { "Content-Type": "application/json" };
        init.body = ep.body || "{}";
      }
      const r = await fetch(`${API_BASE}${ep.path}`, init);
      setResponseStatus(r.status);
      const text = await r.text();
      try {
        // Pretty-print JSON if applicable
        const j = JSON.parse(text);
        setResponse(JSON.stringify(j, null, 2));
      } catch {
        setResponse(text);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container mx-auto px-6 py-12 max-w-5xl">
      <Link
        href="/"
        className="text-sm text-slate-500 hover:text-slate-900 mb-4 inline-block"
      >
        ← Home
      </Link>
      <h1 className="text-4xl font-bold mb-3">API playground</h1>
      <p className="text-slate-600 mb-8 text-lg">
        Pick an endpoint, hit run, see the response. No API key, no signup.
        For the full schema, check the{" "}
        <a
          href={`${API_BASE}/docs`}
          className="text-violet-700 underline"
          target="_blank"
          rel="noopener"
        >
          Swagger docs
        </a>
        .
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <aside className="md:col-span-1">
          <ul className="space-y-1">
            {ENDPOINTS.map((e) => (
              <li key={e.id}>
                <button
                  onClick={() => {
                    setActive(e.id);
                    setResponse("");
                    setResponseStatus(null);
                  }}
                  className={`w-full text-left p-2 rounded text-sm font-mono ${
                    active === e.id
                      ? "bg-violet-100 text-violet-900"
                      : "hover:bg-slate-100 text-slate-700"
                  }`}
                >
                  <span className="text-xs font-bold mr-2 opacity-60">
                    {e.method}
                  </span>
                  {e.path.split("?")[0].replace("/api/v1", "")}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div className="md:col-span-2">
          <div className="border rounded-lg p-5 bg-white mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold bg-slate-100 px-2 py-0.5 rounded">
                {ep.method}
              </span>
              <code className="font-mono text-sm text-slate-700">{ep.path}</code>
            </div>
            <p className="text-sm text-slate-600 mb-4">{ep.description}</p>

            {ep.body && (
              <details className="mb-4">
                <summary className="text-xs text-slate-500 cursor-pointer">
                  Request body
                </summary>
                <pre className="bg-slate-900 text-slate-100 rounded p-3 text-xs mt-2">
                  {ep.body}
                </pre>
              </details>
            )}

            <button
              onClick={run}
              disabled={loading}
              className="px-4 py-2 bg-violet-600 text-white rounded hover:bg-violet-500 disabled:opacity-50 text-sm font-medium"
            >
              {loading ? "Running…" : "Run request"}
            </button>
          </div>

          {error && (
            <div className="border-l-4 border-red-500 bg-red-50 p-4 rounded mb-4 text-sm text-red-900">
              {error}
            </div>
          )}

          {responseStatus !== null && (
            <div className="border rounded-lg overflow-hidden mb-4">
              <div className="px-4 py-2 bg-slate-100 flex items-center justify-between text-sm">
                <span>
                  Response{" "}
                  <span
                    className={
                      responseStatus >= 200 && responseStatus < 300
                        ? "text-emerald-700"
                        : "text-red-700"
                    }
                  >
                    {responseStatus}
                  </span>
                </span>
                <span className="text-xs text-slate-500">
                  {response.length.toLocaleString()} bytes
                </span>
              </div>
              <pre className="p-4 bg-slate-900 text-slate-100 text-xs overflow-x-auto max-h-[480px]">
                {response.length > 8000
                  ? response.slice(0, 8000) + "\n…(truncated for display)"
                  : response}
              </pre>
            </div>
          )}
        </div>
      </div>

      <section className="text-sm text-slate-500 border-t pt-6 mt-12">
        <p>
          This page calls the public API directly from your browser — every
          response you see is what any consumer would get. Rate limits apply
          (60/minute per IP).
        </p>
      </section>
    </main>
  );
}
