import { ImageResponse } from "next/og";

export const alt = "stakesense — predictive validator scoring for Solana";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage() {
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
          padding: "80px",
          color: "white",
        }}
      >
        <div style={{ fontSize: 32, fontWeight: 700, opacity: 0.9, display: "flex" }}>
          stakesense
        </div>
        <div
          style={{
            fontSize: 80,
            fontWeight: 800,
            lineHeight: 1.05,
            marginTop: 80,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ display: "flex" }}>Stake smarter.</div>
          <div
            style={{
              display: "flex",
              background: "linear-gradient(to right, #a78bfa, #60a5fa)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            Decentralize Solana.
          </div>
        </div>
        <div
          style={{
            fontSize: 28,
            marginTop: 40,
            opacity: 0.8,
            maxWidth: "70%",
            display: "flex",
          }}
        >
          ML-powered scoring on three pillars: downtime risk, MEV tax,
          decentralization. Open source. Updated every epoch.
        </div>
        <div
          style={{
            marginTop: "auto",
            display: "flex",
            gap: 32,
            fontSize: 22,
            opacity: 0.7,
          }}
        >
          <span style={{ display: "flex" }}>● Live</span>
          <span style={{ display: "flex" }}>● Open source</span>
          <span style={{ display: "flex" }}>● Public Goods tier</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
