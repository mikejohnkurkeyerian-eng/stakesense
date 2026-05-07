"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type ValidatorRow = {
  vote_pubkey: string;
  name: string | null;
  composite_score: number | null;
  downtime_prob_7d: number | null;
  mev_tax_rate: number | null;
  decentralization_score: number | null;
  data_center: string | null;
  country: string | null;
};

type Allocation = { id: string; voter_pubkey: string; sol: number };

type ConcBucket = { label: string; sol: number; pct: number };

type AllocationReport = {
  total_sol: number;
  weighted_composite: number | null;
  weighted_downtime_prob: number | null;
  weighted_mev_tax: number | null;
  weighted_decentralization: number | null;
  by_data_center: ConcBucket[];
  by_asn: ConcBucket[];
  by_country: ConcBucket[];
  n_validators: number;
};

type Delta = {
  composite: number | null;
  downtime_prob: number | null;
  mev_tax: number | null;
  decentralization: number | null;
  top_dc_pct: number | null;
  top_asn_pct: number | null;
  top_country_pct: number | null;
  insights: string[];
};

type SimReport = {
  before: AllocationReport;
  after: AllocationReport;
  delta: Delta;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE!;

function pct(x: number | null | undefined, digits = 1) {
  return x == null ? "—" : `${(x * 100).toFixed(digits)}%`;
}
function score(x: number | null | undefined) {
  return x == null ? "—" : x.toFixed(3);
}
function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export default function SimulatePage() {
  const [validators, setValidators] = useState<ValidatorRow[]>([]);
  const [validatorsLoading, setValidatorsLoading] = useState(true);
  const [before, setBefore] = useState<Allocation[]>([]);
  const [after, setAfter] = useState<Allocation[]>([]);
  const [report, setReport] = useState<SimReport | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [findingBest, setFindingBest] = useState(false);
  const [optimizeNotes, setOptimizeNotes] = useState<string[]>([]);
  const [bestObjective, setBestObjective] = useState<
    "composite" | "downtime" | "decentralization"
  >("composite");

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/v1/validators?limit=200&sort=composite`);
        const j = await r.json();
        setValidators(j.results || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "failed to load validators");
      } finally {
        setValidatorsLoading(false);
      }
    })();
  }, []);

  const lookup = useMemo(() => {
    const m = new Map<string, ValidatorRow>();
    for (const v of validators) m.set(v.vote_pubkey, v);
    return m;
  }, [validators]);

  function loadExample() {
    if (validators.length < 6) return;
    // Before: spread across 3 average-scoring validators
    const mid = validators.slice(40, 60);
    const top = validators.slice(0, 20);
    setBefore([
      { id: uid(), voter_pubkey: mid[0].vote_pubkey, sol: 100 },
      { id: uid(), voter_pubkey: mid[5].vote_pubkey, sol: 100 },
      { id: uid(), voter_pubkey: mid[10].vote_pubkey, sol: 100 },
    ]);
    setAfter([
      { id: uid(), voter_pubkey: top[0].vote_pubkey, sol: 100 },
      { id: uid(), voter_pubkey: top[4].vote_pubkey, sol: 100 },
      { id: uid(), voter_pubkey: top[8].vote_pubkey, sol: 100 },
    ]);
  }

  function copyToAfter() {
    setAfter(before.map((b) => ({ ...b, id: uid() })));
  }

  async function findBestSwap() {
    if (!before.length) return;
    setFindingBest(true);
    setError(null);
    setOptimizeNotes([]);
    try {
      const r = await fetch(`${API_BASE}/api/v1/simulate/optimize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          before: before.map(({ voter_pubkey, sol }) => ({ voter_pubkey, sol })),
          objective: bestObjective,
          max_moves: 5,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.detail || `request failed: ${r.status}`);
      const suggested: { voter_pubkey: string; sol: number }[] = j.after || [];
      setAfter(
        suggested.map((s) => ({ id: uid(), voter_pubkey: s.voter_pubkey, sol: s.sol }))
      );
      setOptimizeNotes(j.notes || []);
      // Auto-run the simulation so deltas appear immediately.
      const sim = await fetch(`${API_BASE}/api/v1/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          before: before.map(({ voter_pubkey, sol }) => ({ voter_pubkey, sol })),
          after: suggested,
        }),
      });
      const simBody = await sim.json();
      if (sim.ok) setReport(simBody as SimReport);
    } catch (e) {
      setError(e instanceof Error ? e.message : "optimization failed");
    } finally {
      setFindingBest(false);
    }
  }

  async function run() {
    setRunning(true);
    setError(null);
    setReport(null);
    try {
      const r = await fetch(`${API_BASE}/api/v1/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          before: before.map(({ voter_pubkey, sol }) => ({ voter_pubkey, sol })),
          after: after.map(({ voter_pubkey, sol }) => ({ voter_pubkey, sol })),
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.detail || `request failed: ${r.status}`);
      setReport(j as SimReport);
    } catch (e) {
      setError(e instanceof Error ? e.message : "simulation failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <main className="container mx-auto px-6 py-12 max-w-6xl">
      <Link href="/" className="text-sm text-slate-500 hover:text-slate-900 mb-4 inline-block">
        ← Home
      </Link>
      <h1 className="text-4xl font-bold mb-3">Stake migration simulator</h1>
      <p className="text-slate-600 mb-2 text-lg">
        Build two allocations side-by-side. We&apos;ll compute stake-weighted composite,
        downtime risk, MEV tax, decentralization, and concentration deltas.
      </p>
      <p className="text-slate-500 text-sm mb-6">
        No wallet, no signing — pure what-if analysis using the latest model predictions.
      </p>

      <div className="flex flex-wrap gap-3 mb-3 items-center">
        <button
          disabled={validatorsLoading}
          onClick={loadExample}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50"
        >
          Load example (mid-tier → top-tier)
        </button>
        <button
          disabled={!before.length}
          onClick={copyToAfter}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50"
        >
          Copy Before → After
        </button>
        <button
          disabled={running || (!before.length && !after.length)}
          onClick={run}
          className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 font-medium ml-auto"
        >
          {running ? "Simulating…" : "Run simulation"}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 items-center mb-6 p-3 border border-violet-200 rounded-lg bg-violet-50/50">
        <span className="text-sm font-semibold text-violet-900">
          ✨ Auto-fill After:
        </span>
        <select
          value={bestObjective}
          onChange={(e) =>
            setBestObjective(
              e.target.value as "composite" | "downtime" | "decentralization"
            )
          }
          className="border rounded px-2 py-1.5 text-sm bg-white"
          disabled={findingBest}
        >
          <option value="composite">Maximize composite</option>
          <option value="downtime">Minimize downtime risk</option>
          <option value="decentralization">Maximize decentralization</option>
        </select>
        <button
          disabled={findingBest || !before.length}
          onClick={findBestSwap}
          className="px-3 py-1.5 bg-violet-700 text-white rounded text-sm font-medium hover:bg-violet-800 disabled:opacity-50"
        >
          {findingBest ? "Finding…" : "Find best swap"}
        </button>
        <span className="text-xs text-slate-600 ml-auto">
          Greedy optimizer fills the After column from your Before allocation.
        </span>
      </div>

      {optimizeNotes.length > 0 && (
        <div className="border-l-4 border-violet-400 bg-violet-50 p-3 rounded mb-4 text-sm text-violet-900">
          <ul className="space-y-1">
            {optimizeNotes.map((n, i) => (
              <li key={i}>· {n}</li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <div className="border-l-4 border-red-500 bg-red-50 p-4 rounded mb-6 text-sm text-red-900">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <AllocationColumn
          title="Before"
          subtitle="Your current allocation"
          rows={before}
          setRows={setBefore}
          validators={validators}
          loading={validatorsLoading}
          report={report?.before}
        />
        <AllocationColumn
          title="After"
          subtitle="Hypothetical allocation"
          rows={after}
          setRows={setAfter}
          validators={validators}
          loading={validatorsLoading}
          report={report?.after}
          accent
        />
      </div>

      {report && <DeltaPanel report={report} lookup={lookup} />}
    </main>
  );
}

function AllocationColumn({
  title,
  subtitle,
  rows,
  setRows,
  validators,
  loading,
  report,
  accent,
}: {
  title: string;
  subtitle: string;
  rows: Allocation[];
  setRows: (rows: Allocation[]) => void;
  validators: ValidatorRow[];
  loading: boolean;
  report?: AllocationReport;
  accent?: boolean;
}) {
  const total = rows.reduce((acc, r) => acc + (Number(r.sol) || 0), 0);

  function add() {
    if (validators.length === 0) return;
    setRows([...rows, { id: uid(), voter_pubkey: validators[0].vote_pubkey, sol: 100 }]);
  }
  function update(id: string, patch: Partial<Allocation>) {
    setRows(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function remove(id: string) {
    setRows(rows.filter((r) => r.id !== id));
  }

  return (
    <div
      className={`border rounded-lg p-5 bg-white ${
        accent ? "border-violet-200" : ""
      }`}
    >
      <div className="flex items-baseline justify-between mb-1">
        <h2 className="text-xl font-bold">{title}</h2>
        <span className="text-sm text-slate-500 tabular-nums">
          {total.toLocaleString(undefined, { maximumFractionDigits: 2 })} SOL · {rows.length}{" "}
          validator{rows.length === 1 ? "" : "s"}
        </span>
      </div>
      <p className="text-xs text-slate-500 mb-4">{subtitle}</p>

      <div className="space-y-2 mb-3">
        {rows.length === 0 && (
          <div className="border border-dashed border-slate-300 rounded p-4 text-center text-sm text-slate-500">
            No validators yet. Click &quot;Add&quot; or &quot;Load example&quot;.
          </div>
        )}
        {rows.map((row) => (
          <div key={row.id} className="flex gap-2">
            <select
              value={row.voter_pubkey}
              onChange={(e) => update(row.id, { voter_pubkey: e.target.value })}
              className="flex-1 border rounded px-2 py-1.5 text-sm bg-white min-w-0"
              disabled={loading}
            >
              {validators.map((v) => (
                <option key={v.vote_pubkey} value={v.vote_pubkey}>
                  {(v.name || v.vote_pubkey.slice(0, 12) + "…") +
                    "  · composite " +
                    (v.composite_score != null ? v.composite_score.toFixed(2) : "—")}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={0.01}
              step="any"
              value={row.sol}
              onChange={(e) => update(row.id, { sol: Number(e.target.value) })}
              className="w-24 border rounded px-2 py-1.5 text-sm tabular-nums text-right"
            />
            <button
              onClick={() => remove(row.id)}
              className="px-2 text-slate-400 hover:text-red-600 text-lg"
              title="Remove"
              aria-label="Remove validator"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={add}
        disabled={loading}
        className="w-full px-3 py-2 border border-dashed border-slate-300 rounded text-sm hover:bg-slate-50 disabled:opacity-50"
      >
        + Add validator
      </button>

      {report && (
        <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-2 text-xs">
          <Stat label="Composite" value={score(report.weighted_composite)} />
          <Stat label="Downtime" value={pct(report.weighted_downtime_prob)} />
          <Stat label="MEV tax" value={pct(report.weighted_mev_tax, 2)} />
          <Stat label="Decentralization" value={score(report.weighted_decentralization)} />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function deltaClass(d: number | null, goodIsUp: boolean) {
  if (d == null) return "text-slate-500";
  const good = (d > 0 && goodIsUp) || (d < 0 && !goodIsUp);
  if (Math.abs(d) < 0.001) return "text-slate-500";
  return good ? "text-emerald-600" : "text-red-600";
}

function fmtDelta(d: number | null, kind: "score" | "pct") {
  if (d == null) return "—";
  if (kind === "score") return (d >= 0 ? "+" : "") + d.toFixed(3);
  return (d >= 0 ? "+" : "") + (d * 100).toFixed(1) + " pp";
}

function DeltaPanel({ report, lookup }: { report: SimReport; lookup: Map<string, ValidatorRow> }) {
  void lookup;
  const d = report.delta;
  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-3">Impact</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <DeltaCard
            label="Composite"
            beforeVal={score(report.before.weighted_composite)}
            afterVal={score(report.after.weighted_composite)}
            delta={fmtDelta(d.composite, "score")}
            cls={deltaClass(d.composite, true)}
          />
          <DeltaCard
            label="Downtime risk"
            beforeVal={pct(report.before.weighted_downtime_prob)}
            afterVal={pct(report.after.weighted_downtime_prob)}
            delta={fmtDelta(d.downtime_prob, "pct")}
            cls={deltaClass(d.downtime_prob, false)}
          />
          <DeltaCard
            label="MEV tax"
            beforeVal={pct(report.before.weighted_mev_tax, 2)}
            afterVal={pct(report.after.weighted_mev_tax, 2)}
            delta={fmtDelta(d.mev_tax, "pct")}
            cls={deltaClass(d.mev_tax, false)}
          />
          <DeltaCard
            label="Decentralization"
            beforeVal={score(report.before.weighted_decentralization)}
            afterVal={score(report.after.weighted_decentralization)}
            delta={fmtDelta(d.decentralization, "score")}
            cls={deltaClass(d.decentralization, true)}
          />
        </div>
      </div>

      {d.insights.length > 0 && (
        <div className="border rounded-lg p-5 bg-slate-50">
          <h3 className="font-semibold mb-2 text-sm uppercase tracking-wide text-slate-600">
            Insights
          </h3>
          <ul className="space-y-1.5 text-sm">
            {d.insights.map((line, i) => (
              <li key={i} className="text-slate-800">
                · {line}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        <ConcCompare
          title="Top data center"
          before={report.before.by_data_center}
          after={report.after.by_data_center}
        />
        <ConcCompare
          title="Top ASN"
          before={report.before.by_asn}
          after={report.after.by_asn}
        />
        <ConcCompare
          title="Top country"
          before={report.before.by_country}
          after={report.after.by_country}
        />
      </div>
    </section>
  );
}

function DeltaCard({
  label,
  beforeVal,
  afterVal,
  delta,
  cls,
}: {
  label: string;
  beforeVal: string;
  afterVal: string;
  delta: string;
  cls: string;
}) {
  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">{label}</div>
      <div className="text-xs text-slate-500 tabular-nums">
        {beforeVal} <span className="text-slate-400">→</span> {afterVal}
      </div>
      <div className={`text-lg font-bold tabular-nums ${cls}`}>{delta}</div>
    </div>
  );
}

function ConcCompare({
  title,
  before,
  after,
}: {
  title: string;
  before: ConcBucket[];
  after: ConcBucket[];
}) {
  const top3 = (b: ConcBucket[]) => b.slice(0, 3);
  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="text-sm font-semibold mb-2">{title}</div>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">Before</div>
          {top3(before).length === 0 ? (
            <div className="text-slate-400">—</div>
          ) : (
            <ul className="space-y-1">
              {top3(before).map((b) => (
                <li key={b.label} className="flex justify-between gap-2">
                  <span className="truncate text-slate-700">{b.label}</span>
                  <span className="tabular-nums">{(b.pct * 100).toFixed(0)}%</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">After</div>
          {top3(after).length === 0 ? (
            <div className="text-slate-400">—</div>
          ) : (
            <ul className="space-y-1">
              {top3(after).map((b) => (
                <li key={b.label} className="flex justify-between gap-2">
                  <span className="truncate text-slate-700">{b.label}</span>
                  <span className="tabular-nums">{(b.pct * 100).toFixed(0)}%</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
