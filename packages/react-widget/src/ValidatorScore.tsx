import { useEffect, useState } from "react";

import type { ValidatorDetailRow, ValidatorScoreProps } from "./types.js";

const DEFAULT_API = "https://stakesense.onrender.com";

export function ValidatorScore({
  votePubkey,
  apiBase = DEFAULT_API,
  theme = "light",
  size = "full",
  className = "",
}: ValidatorScoreProps) {
  const [data, setData] = useState<ValidatorDetailRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    fetch(`${apiBase}/api/v1/validators/${encodeURIComponent(votePubkey)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`stakesense ${r.status}`);
        return r.json();
      })
      .then((j) => {
        if (!cancelled) setData(j as ValidatorDetailRow);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "fetch failed");
      });
    return () => {
      cancelled = true;
    };
  }, [apiBase, votePubkey]);

  const isDark = theme === "dark";
  const isCompact = size === "compact";
  const wrapStyle: React.CSSProperties = {
    fontFamily:
      "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    background: isDark ? "#0f172a" : "#ffffff",
    color: isDark ? "#e2e8f0" : "#0f172a",
    border: `1px solid ${isDark ? "#1e293b" : "#e2e8f0"}`,
    borderRadius: 8,
    padding: isCompact ? 12 : 18,
    maxWidth: isCompact ? 240 : 360,
    fontSize: 14,
    lineHeight: 1.4,
  };

  if (error) {
    return (
      <div className={className} style={{ ...wrapStyle, color: "#dc2626" }}>
        Couldn&apos;t load validator: {error}
      </div>
    );
  }
  if (!data) {
    return (
      <div className={className} style={{ ...wrapStyle, opacity: 0.7 }}>
        Loading…
      </div>
    );
  }
  const v = data.validator;
  const fmt = (n: number | null, kind: "score" | "pct") =>
    n == null
      ? "—"
      : kind === "score"
        ? n.toFixed(3)
        : `${(n * 100).toFixed(1)}%`;
  return (
    <div className={className} style={wrapStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <strong style={{ fontSize: isCompact ? 14 : 16 }}>
          {v.name || `${votePubkey.slice(0, 6)}…${votePubkey.slice(-4)}`}
        </strong>
        <span style={{ fontSize: 11, opacity: 0.6 }}>stakesense</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
        <Cell label="Composite" value={fmt(v.composite_score, "score")} />
        <Cell label="Downtime" value={fmt(v.downtime_prob_7d, "pct")} />
        {!isCompact && (
          <>
            <Cell label="MEV tax" value={fmt(v.mev_tax_rate, "pct")} />
            <Cell label="Decentralization" value={fmt(v.decentralization_score, "score")} />
          </>
        )}
      </div>
      {!isCompact && (v.data_center || v.country) && (
        <div style={{ fontSize: 11, opacity: 0.6, marginTop: 8 }}>
          {[v.data_center, v.country].filter(Boolean).join(" · ")}
        </div>
      )}
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 0.4, opacity: 0.6 }}>
        {label}
      </div>
      <div style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{value}</div>
    </div>
  );
}
