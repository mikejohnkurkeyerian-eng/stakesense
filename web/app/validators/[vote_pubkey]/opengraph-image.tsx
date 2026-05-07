import { ImageResponse } from "next/og";

export const alt = "Validator scorecard — stakesense";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "edge";

type Validator = {
  vote_pubkey: string;
  name: string | null;
  commission_pct: number | null;
  active_stake: number | null;
  data_center: string | null;
  country: string | null;
  composite_score: number | null;
  downtime_prob_7d: number | null;
  mev_tax_rate: number | null;
  decentralization_score: number | null;
};

type Stats = { nakamoto_coefficient: number | null };

async function safeJson<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(8_000) });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

function pct(x: number | null | undefined) {
  return x == null ? "—" : `${(x * 100).toFixed(1)}%`;
}

function shortPk(pk: string) {
  return `${pk.slice(0, 6)}…${pk.slice(-4)}`;
}

export default async function ValidatorOG({
  params,
}: {
  params: Promise<{ vote_pubkey: string }>;
}) {
  const { vote_pubkey } = await params;
  const base = process.env.NEXT_PUBLIC_API_BASE!;

  const [detail, stats] = await Promise.all([
    safeJson<{ validator: Validator }>(`${base}/api/v1/validators/${vote_pubkey}`),
    safeJson<Stats>(`${base}/api/v1/validators/stats`),
  ]);

  const v = detail?.validator ?? null;
  const composite = v?.composite_score ?? null;
  const compositeText = composite == null ? "—" : composite.toFixed(3);
  const displayName = v?.name ?? shortPk(vote_pubkey);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background:
            "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)",
          display: "flex",
          flexDirection: "column",
          padding: "72px",
          color: "white",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: 28, fontWeight: 700, opacity: 0.85, display: "flex" }}>
            stakesense · validator scorecard
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 18,
              opacity: 0.7,
              padding: "6px 14px",
              border: "1px solid rgba(255,255,255,0.25)",
              borderRadius: 999,
            }}
          >
            ● Live
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 56,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 64,
              fontWeight: 800,
              lineHeight: 1.05,
              maxWidth: "90%",
            }}
          >
            {displayName}
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: "monospace",
              fontSize: 20,
              marginTop: 12,
              opacity: 0.55,
            }}
          >
            {vote_pubkey}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 24,
            marginTop: 48,
          }}
        >
          <Stat
            label="Composite"
            value={compositeText}
            accent="linear-gradient(to right, #a78bfa, #60a5fa)"
            big
          />
          <Stat label="Downtime risk" value={pct(v?.downtime_prob_7d)} />
          <Stat label="MEV tax" value={pct(v?.mev_tax_rate)} />
          <Stat
            label="Decentralization"
            value={
              v?.decentralization_score == null
                ? "—"
                : v.decentralization_score.toFixed(3)
            }
          />
        </div>

        <div
          style={{
            marginTop: "auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            fontSize: 22,
            opacity: 0.7,
          }}
        >
          <div style={{ display: "flex", gap: 28 }}>
            <span style={{ display: "flex" }}>
              Commission {v?.commission_pct == null ? "—" : `${v.commission_pct}%`}
            </span>
            <span style={{ display: "flex" }}>
              {v?.country ?? v?.data_center ?? "Location unknown"}
            </span>
            {stats?.nakamoto_coefficient != null && (
              <span style={{ display: "flex" }}>
                Nakamoto {stats.nakamoto_coefficient}
              </span>
            )}
          </div>
          <div style={{ display: "flex", fontWeight: 700, opacity: 0.85 }}>
            stakesense.app
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}

function Stat({
  label,
  value,
  accent,
  big,
}: {
  label: string;
  value: string;
  accent?: string;
  big?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: big ? 1.4 : 1,
        padding: "20px 24px",
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 16,
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 16,
          textTransform: "uppercase",
          letterSpacing: 1.5,
          opacity: 0.6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          display: "flex",
          fontSize: big ? 60 : 38,
          fontWeight: 800,
          marginTop: 6,
          ...(accent
            ? {
                background: accent,
                backgroundClip: "text",
                color: "transparent",
              }
            : {}),
        }}
      >
        {value}
      </div>
    </div>
  );
}
