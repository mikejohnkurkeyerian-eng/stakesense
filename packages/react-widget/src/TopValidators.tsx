import { useEffect, useState } from "react";

import type { TopValidatorsProps, ValidatorRow } from "./types.js";

const DEFAULT_API = "https://stakesense.onrender.com";

export function TopValidators({
  count = 5,
  sort = "composite",
  apiBase = DEFAULT_API,
  theme = "light",
  className = "",
}: TopValidatorsProps) {
  const [rows, setRows] = useState<ValidatorRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(
      `${apiBase}/api/v1/validators?sort=${sort}&limit=${count}`,
    )
      .then(async (r) => {
        if (!r.ok) throw new Error(`stakesense ${r.status}`);
        return r.json();
      })
      .then((j: { results: ValidatorRow[] }) => {
        if (!cancelled) setRows(j.results || []);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "fetch failed");
      });
    return () => {
      cancelled = true;
    };
  }, [apiBase, sort, count]);

  const isDark = theme === "dark";
  const wrapStyle: React.CSSProperties = {
    fontFamily:
      "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    background: isDark ? "#0f172a" : "#ffffff",
    color: isDark ? "#e2e8f0" : "#0f172a",
    border: `1px solid ${isDark ? "#1e293b" : "#e2e8f0"}`,
    borderRadius: 8,
    padding: 14,
    fontSize: 14,
  };
  const labels: Record<string, string> = {
    composite: "Composite",
    downtime: "Downtime risk",
    mev_tax: "MEV tax",
    decentralization: "Decentralization",
  };

  if (error) {
    return <div className={className} style={{ ...wrapStyle, color: "#dc2626" }}>{error}</div>;
  }
  if (!rows) {
    return <div className={className} style={{ ...wrapStyle, opacity: 0.7 }}>Loading…</div>;
  }
  return (
    <div className={className} style={wrapStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <strong>Top by {labels[sort] || sort}</strong>
        <span style={{ fontSize: 11, opacity: 0.6 }}>stakesense</span>
      </div>
      <ol style={{ paddingLeft: 18, margin: 0, fontSize: 13 }}>
        {rows.map((r) => (
          <li key={r.vote_pubkey} style={{ marginBottom: 4 }}>
            <span>{r.name || `${r.vote_pubkey.slice(0, 6)}…`}</span>
            <span style={{ float: "right", fontVariantNumeric: "tabular-nums", opacity: 0.85 }}>
              {fmtFor(sort, r)}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function fmtFor(sort: string, r: ValidatorRow): string {
  const v =
    sort === "downtime"
      ? r.downtime_prob_7d
      : sort === "mev_tax"
        ? r.mev_tax_rate
        : sort === "decentralization"
          ? r.decentralization_score
          : r.composite_score;
  if (v == null) return "—";
  return sort === "composite" || sort === "decentralization"
    ? v.toFixed(3)
    : `${(v * 100).toFixed(1)}%`;
}
