import Link from "next/link";

export const metadata = {
  title: "Alerts — recent validator changes · stakesense",
  description:
    "Validators with recent state changes — MEV commission jumps, newly delinquent operators, composite-score movers. Updated twice daily.",
  alternates: { canonical: "/alerts" },
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "https://stakesense.onrender.com";

type Detection = {
  kind: string;
  vote_pubkey: string;
  name: string | null;
  magnitude: number;
  summary: string;
  epoch?: number;
  current_date?: string;
};

async function fetchAnomalies(): Promise<Detection[]> {
  try {
    const r = await fetch(`${API_BASE}/api/v1/anomalies?limit=30`, {
      next: { revalidate: 600 },
    });
    if (!r.ok) return [];
    const j = await r.json();
    return (j.detections || []) as Detection[];
  } catch {
    return [];
  }
}

function shortPk(pk: string) {
  return `${pk.slice(0, 4)}…${pk.slice(-4)}`;
}

function badgeClass(kind: string) {
  switch (kind) {
    case "mev_commission_change":
      return "bg-amber-100 text-amber-900";
    case "newly_delinquent":
      return "bg-red-100 text-red-900";
    case "composite_drop":
      return "bg-orange-100 text-orange-900";
    case "composite_climb":
      return "bg-emerald-100 text-emerald-900";
    default:
      return "bg-slate-100 text-slate-900";
  }
}

function badgeLabel(kind: string) {
  switch (kind) {
    case "mev_commission_change":
      return "MEV Δ";
    case "newly_delinquent":
      return "DELINQUENT";
    case "composite_drop":
      return "DROP";
    case "composite_climb":
      return "CLIMB";
    default:
      return kind;
  }
}

export default async function AlertsPage() {
  const detections = await fetchAnomalies();

  const grouped: Record<string, Detection[]> = {};
  for (const d of detections) {
    (grouped[d.kind] ||= []).push(d);
  }

  return (
    <main className="container mx-auto px-6 py-12 max-w-4xl">
      <Link
        href="/"
        className="text-sm text-slate-500 hover:text-slate-900 mb-4 inline-block"
      >
        ← Home
      </Link>
      <h1 className="text-4xl font-bold mb-3">Recent validator changes</h1>
      <p className="text-slate-600 mb-3 text-lg">
        Validators whose state moved meaningfully between the last two
        observations stakesense has on file. Updated twice daily.
      </p>
      <p className="text-slate-500 text-sm mb-10">
        Detections include MEV commission jumps (≥5pp), newly delinquent
        operators, and composite-score moves of ≥5pp in either direction.
      </p>

      {detections.length === 0 ? (
        <div className="border rounded-lg p-8 bg-slate-50 text-slate-600 text-center">
          No notable changes in the latest window. Check back after the next
          cron run.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
            <KindCard
              label="Newly delinquent"
              count={(grouped["newly_delinquent"] || []).length}
              tone="red"
            />
            <KindCard
              label="Composite drops"
              count={(grouped["composite_drop"] || []).length}
              tone="orange"
            />
            <KindCard
              label="Composite climbs"
              count={(grouped["composite_climb"] || []).length}
              tone="emerald"
            />
            <KindCard
              label="MEV commission Δ"
              count={(grouped["mev_commission_change"] || []).length}
              tone="amber"
            />
          </div>

          <section className="mb-10">
            <h2 className="text-xl font-bold mb-4">Top detections</h2>
            <ul className="space-y-2">
              {detections.map((d, i) => (
                <li
                  key={`${d.kind}-${d.vote_pubkey}-${i}`}
                  className="border rounded-lg p-4 bg-white flex items-start gap-3"
                >
                  <span
                    className={`px-2 py-1 rounded text-xs font-bold flex-shrink-0 ${badgeClass(d.kind)}`}
                  >
                    {badgeLabel(d.kind)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900">
                      {d.name || (
                        <span className="font-mono text-sm">
                          {shortPk(d.vote_pubkey)}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-slate-600 mt-1">
                      {d.summary}
                    </div>
                  </div>
                  <Link
                    href={`/validators/${d.vote_pubkey}`}
                    className="text-violet-700 hover:underline text-sm flex-shrink-0"
                  >
                    Detail →
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      <section className="text-sm text-slate-500 border-t pt-6 space-y-2">
        <p>
          Detections come from <code>/api/v1/anomalies</code>. The same data
          is available to AI agents via the{" "}
          <Link href="/integrations/mcp" className="text-violet-700 underline">
            MCP server
          </Link>
          .
        </p>
        <p>
          Want push notifications when something on your stake list changes?
          That&apos;s on the post-hackathon roadmap. Drop a thumbs-up on{" "}
          <a
            href="https://github.com/mikejohnkurkeyerian-eng/stakesense/issues"
            className="text-violet-700 underline"
          >
            GitHub issues
          </a>{" "}
          to bump priority.
        </p>
      </section>
    </main>
  );
}

function KindCard({
  label,
  count,
  tone,
}: {
  label: string;
  count: number;
  tone: "red" | "orange" | "emerald" | "amber";
}) {
  const toneClasses: Record<string, string> = {
    red: "border-red-200 bg-red-50 text-red-900",
    orange: "border-orange-200 bg-orange-50 text-orange-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
  };
  return (
    <div className={`border rounded-lg p-4 ${toneClasses[tone]}`}>
      <div className="text-xs uppercase tracking-wide opacity-80 mb-1">
        {label}
      </div>
      <div className="text-3xl font-bold tabular-nums">{count}</div>
    </div>
  );
}
