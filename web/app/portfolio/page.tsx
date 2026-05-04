"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import Link from "next/link";
import { useState } from "react";

type Position = {
  stake_account: string;
  voter_pubkey: string | null;
  sol: number;
  state: string;
  validator_name: string | null;
  composite_score: number | null;
  downtime_prob_7d: number | null;
  mev_tax_rate: number | null;
  decentralization_score: number | null;
  data_center: string | null;
  asn: string | null;
  country: string | null;
};

type ConcBucket = {
  label: string;
  sol: number;
  pct_of_portfolio: number;
  n_validators: number;
};

type Warning = {
  severity: "info" | "warn" | "high";
  message: string;
  detail: string | null;
};

type Suggestion = {
  from_stake_account: string;
  from_voter_pubkey: string;
  from_validator_name: string | null;
  reason: string;
  suggested_voter_pubkey: string;
  suggested_validator_name: string | null;
  suggested_composite: number | null;
};

type Report = {
  owner_pubkey: string;
  positions: Position[];
  total_sol: number;
  total_active_sol: number;
  weighted_composite: number | null;
  weighted_downtime_prob: number | null;
  weighted_mev_tax: number | null;
  weighted_decentralization: number | null;
  concentration_by_data_center: ConcBucket[];
  concentration_by_asn: ConcBucket[];
  concentration_by_country: ConcBucket[];
  warnings: Warning[];
  rebalance_suggestions: Suggestion[];
};

function pct(x: number | null) {
  return x == null ? "—" : `${(x * 100).toFixed(1)}%`;
}

function shortPk(pk: string) {
  return `${pk.slice(0, 4)}…${pk.slice(-4)}`;
}

function severityClasses(s: Warning["severity"]) {
  return s === "high"
    ? "border-red-300 bg-red-50 text-red-900"
    : s === "warn"
    ? "border-amber-300 bg-amber-50 text-amber-900"
    : "border-slate-300 bg-slate-50 text-slate-900";
}

export default function PortfolioPage() {
  const { publicKey, connected } = useWallet();
  const [input, setInput] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchReport(pk: string) {
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const r = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE}/api/v1/portfolio/${pk}`
      );
      const j = await r.json();
      if (!r.ok) {
        throw new Error(j.detail || `request failed: ${r.status}`);
      }
      setReport(j as Report);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to analyze portfolio");
    } finally {
      setLoading(false);
    }
  }

  function useConnectedWallet() {
    if (publicKey) {
      const pk = publicKey.toBase58();
      setInput(pk);
      fetchReport(pk);
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
      <h1 className="text-4xl font-bold mb-3">Portfolio analyzer</h1>
      <p className="text-slate-600 mb-8 text-lg">
        Paste any Solana wallet (or connect yours) — we&apos;ll find the stake
        accounts, score every delegation, surface concentration risk, and
        suggest rebalances.
      </p>

      <div className="border rounded-lg p-6 bg-white mb-8">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[280px]">
            <label className="text-xs uppercase tracking-wide text-slate-500 mb-1 block">
              Wallet pubkey
            </label>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value.trim())}
              placeholder="e.g. 5Xq…wpz"
              className="border rounded-lg px-3 py-2 w-full font-mono text-sm"
            />
          </div>
          <button
            disabled={!input || loading}
            onClick={() => fetchReport(input)}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 font-medium"
          >
            {loading ? "Analyzing…" : "Analyze"}
          </button>
          {connected ? (
            <button
              onClick={useConnectedWallet}
              className="px-4 py-2 border border-violet-300 bg-violet-50 text-violet-900 rounded-lg hover:bg-violet-100 text-sm font-medium"
            >
              Use connected wallet
            </button>
          ) : (
            <WalletMultiButton
              style={{
                background: "#0f172a",
                borderRadius: "8px",
                fontSize: "14px",
                height: "40px",
              }}
            />
          )}
        </div>
        <p className="text-xs text-slate-500 mt-3">
          Read-only — no signing required. We only call public Solana RPC to
          enumerate your stake accounts.
        </p>
      </div>

      {error && (
        <div className="border-l-4 border-red-500 bg-red-50 p-4 rounded mb-6 text-sm text-red-900">
          {error}
        </div>
      )}

      {report && <ReportView report={report} />}
    </main>
  );
}

function ReportView({ report }: { report: Report }) {
  return (
    <>
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <Stat label="Total SOL staked" value={report.total_active_sol.toLocaleString(undefined, { maximumFractionDigits: 4 })} />
        <Stat label="Stake-weighted composite" value={pct(report.weighted_composite)} />
        <Stat label="Weighted downtime risk" value={pct(report.weighted_downtime_prob)} />
        <Stat label="Weighted MEV tax" value={pct(report.weighted_mev_tax)} />
      </section>

      {report.warnings.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-bold mb-3">Risk findings</h2>
          <div className="space-y-2">
            {report.warnings.map((w, i) => (
              <div
                key={i}
                className={`border-l-4 ${severityClasses(w.severity)} p-4 rounded`}
              >
                <div className="font-semibold">{w.message}</div>
                {w.detail && (
                  <div className="text-sm mt-1 opacity-90">{w.detail}</div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {report.rebalance_suggestions.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-bold mb-3">Suggested rebalances</h2>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="text-left px-4 py-2">Move from</th>
                  <th className="text-left px-4 py-2">Suggest</th>
                  <th className="text-left px-4 py-2">Why</th>
                </tr>
              </thead>
              <tbody>
                {report.rebalance_suggestions.map((s) => (
                  <tr key={s.from_stake_account} className="border-t">
                    <td className="px-4 py-2">
                      <div className="font-medium">
                        {s.from_validator_name ||
                          (s.from_voter_pubkey
                            ? shortPk(s.from_voter_pubkey)
                            : "—")}
                      </div>
                      <div className="text-xs text-slate-500 font-mono">
                        {shortPk(s.from_stake_account)}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="font-medium">
                        {s.suggested_validator_name ||
                          shortPk(s.suggested_voter_pubkey)}
                      </div>
                      <div className="text-xs text-slate-500">
                        Composite {pct(s.suggested_composite)}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-slate-700">{s.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {report.positions.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-bold mb-3">
            Stake accounts ({report.positions.length})
          </h2>
          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="text-left px-4 py-2">Validator</th>
                  <th className="text-right px-4 py-2">SOL</th>
                  <th className="text-right px-4 py-2">Composite</th>
                  <th className="text-right px-4 py-2">Downtime</th>
                  <th className="text-right px-4 py-2">MEV tax</th>
                  <th className="text-left px-4 py-2">Hosting</th>
                </tr>
              </thead>
              <tbody>
                {report.positions.map((p) => (
                  <tr key={p.stake_account} className="border-t">
                    <td className="px-4 py-2">
                      <div className="font-medium">
                        {p.validator_name ||
                          (p.voter_pubkey
                            ? shortPk(p.voter_pubkey)
                            : "(undelegated)")}
                      </div>
                      <div className="text-xs text-slate-500 font-mono">
                        stake {shortPk(p.stake_account)}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {p.sol.toFixed(4)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {pct(p.composite_score)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {pct(p.downtime_prob_7d)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {pct(p.mev_tax_rate)}
                    </td>
                    <td className="px-4 py-2 text-xs text-slate-700">
                      {p.data_center || "—"}
                      {p.country ? ` · ${p.country}` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <ConcSection title="By data center" buckets={report.concentration_by_data_center} />
        <ConcSection title="By ASN" buckets={report.concentration_by_asn} />
        <ConcSection title="By country" buckets={report.concentration_by_country} />
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">
        {label}
      </div>
      <div className="text-xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

function ConcSection({
  title,
  buckets,
}: {
  title: string;
  buckets: ConcBucket[];
}) {
  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="text-sm font-semibold mb-2">{title}</div>
      {buckets.length === 0 ? (
        <div className="text-xs text-slate-500">—</div>
      ) : (
        <ul className="text-xs space-y-1">
          {buckets.slice(0, 5).map((b) => (
            <li
              key={b.label}
              className="flex justify-between"
              title={`${b.n_validators} validator${b.n_validators === 1 ? "" : "s"}`}
            >
              <span className="text-slate-700 truncate mr-2">{b.label}</span>
              <span className="tabular-nums text-slate-900 font-medium">
                {pct(b.pct_of_portfolio)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
