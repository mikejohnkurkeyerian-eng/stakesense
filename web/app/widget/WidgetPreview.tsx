"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

const SAMPLE_VOTE_PUBKEY = "DPjpYCtrNSEX2BLZJBQbXk2bdT7yHoVyVE3HwmK7Z6h";

const TABS = [
  { id: "single-light", label: "Single (light)" },
  { id: "single-dark", label: "Single (dark)" },
  { id: "top-3", label: "Top 3" },
  { id: "compact", label: "Compact" },
];

export default function WidgetPreview() {
  const [active, setActive] = useState<string>("single-light");
  const [voteKey, setVoteKey] = useState<string>(SAMPLE_VOTE_PUBKEY);

  // Re-mount widget elements when the active tab changes — the widget marks
  // each node so we need to clear attributes between renders.
  useEffect(() => {
    const w = (window as unknown as { stakesense?: { mount: (root?: HTMLElement) => void } }).stakesense;
    if (w && typeof w.mount === "function") {
      const container = document.getElementById("stakesense-preview-target");
      if (container) {
        Array.from(container.querySelectorAll("[data-stakesense-validator],[data-stakesense-top]")).forEach(
          (n) => {
            (n as unknown as { __stakesenseRendered?: boolean }).__stakesenseRendered = false;
            n.innerHTML = "";
          }
        );
        w.mount(container);
      }
    }
  }, [active, voteKey]);

  return (
    <>
      <Script src="/widget.js" strategy="afterInteractive" />
      <div className="border rounded-lg p-4 bg-slate-50">
        <div className="flex flex-wrap gap-2 mb-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={`px-3 py-1.5 text-sm rounded ${
                active === t.id
                  ? "bg-slate-900 text-white"
                  : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {active.startsWith("single") || active === "compact" ? (
          <div className="mb-3">
            <label className="text-xs text-slate-500 mr-2">Vote pubkey:</label>
            <input
              value={voteKey}
              onChange={(e) => setVoteKey(e.target.value.trim())}
              className="border rounded px-2 py-1 text-sm font-mono w-full md:w-[460px] mt-1"
            />
          </div>
        ) : null}

        <div
          id="stakesense-preview-target"
          className="bg-white border rounded p-6 flex justify-center min-h-[160px]"
        >
          {active === "single-light" && (
            <div data-stakesense-validator={voteKey} key={`l-${voteKey}`} />
          )}
          {active === "single-dark" && (
            <div
              data-stakesense-validator={voteKey}
              data-stakesense-theme="dark"
              key={`d-${voteKey}`}
            />
          )}
          {active === "top-3" && <div data-stakesense-top="3" key="t-3" />}
          {active === "compact" && (
            <div
              data-stakesense-validator={voteKey}
              data-stakesense-size="compact"
              key={`c-${voteKey}`}
            />
          )}
        </div>
      </div>
    </>
  );
}
