"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

// WalletMultiButton uses browser-only APIs; load it client-only.
const WalletMultiButton = dynamic(
  async () =>
    (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

const PRIMARY_LINKS: { href: string; label: string }[] = [
  { href: "/validators", label: "Validators" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/stake", label: "Stake" },
  { href: "/alerts", label: "Alerts" },
  { href: "/research", label: "Research" },
];

const MORE_LINKS: { href: string; label: string; sub?: string }[] = [
  { href: "/simulate", label: "Migration simulator", sub: "What-if rebalance impact" },
  { href: "/compare", label: "Compare", sub: "Side-by-side validator comparison" },
  { href: "/backtest", label: "Backtest", sub: "Historical strategy performance" },
  { href: "/playground", label: "API playground", sub: "Interactive endpoint explorer" },
  { href: "/widget", label: "Embeddable widget", sub: "Drop a score on any site" },
  { href: "/integrations/mcp", label: "MCP server", sub: "Claude / Cursor integration" },
  { href: "/data", label: "Open data", sub: "CC-BY 4.0 CSV/JSON exports" },
  { href: "/stake/multisig", label: "Multisig staking", sub: "Squads / Realms tx generator" },
  { href: "/methodology", label: "Methodology", sub: "How we score" },
  { href: "/about", label: "About", sub: "Mission + ethos" },
  { href: "/sponsors", label: "Sponsors", sub: "Integrations + attribution" },
  { href: "/changelog", label: "Changelog", sub: "Build velocity story" },
];

export default function ConnectBar() {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <header className="border-b bg-white sticky top-0 z-40">
      <div className="container mx-auto px-6 py-3 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg">
          stakesense
        </Link>
        <nav className="flex gap-5 items-center text-sm">
          {PRIMARY_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-slate-600 hover:text-slate-900 hidden md:inline"
            >
              {l.label}
            </Link>
          ))}
          <div className="relative" ref={moreRef}>
            <button
              onClick={() => setMoreOpen((o) => !o)}
              className="text-slate-600 hover:text-slate-900 inline-flex items-center gap-1"
              aria-expanded={moreOpen}
              aria-haspopup="menu"
            >
              More
              <span className="text-xs">▾</span>
            </button>
            {moreOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-72 bg-white border rounded-lg shadow-xl py-2 max-h-[80vh] overflow-y-auto"
              >
                {MORE_LINKS.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setMoreOpen(false)}
                    className="block px-4 py-2 text-slate-700 hover:bg-violet-50 hover:text-violet-900"
                  >
                    <div className="font-medium">{l.label}</div>
                    {l.sub && (
                      <div className="text-xs text-slate-500">{l.sub}</div>
                    )}
                  </Link>
                ))}
                <div className="border-t my-2" />
                <a
                  href={`${process.env.NEXT_PUBLIC_API_BASE}/docs`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-4 py-2 text-slate-700 hover:bg-violet-50 hover:text-violet-900"
                >
                  <div className="font-medium">API docs ↗</div>
                  <div className="text-xs text-slate-500">Swagger / OpenAPI</div>
                </a>
                <a
                  href="https://github.com/mikejohnkurkeyerian-eng/stakesense"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-4 py-2 text-slate-700 hover:bg-violet-50 hover:text-violet-900"
                >
                  <div className="font-medium">GitHub ↗</div>
                  <div className="text-xs text-slate-500">Source code</div>
                </a>
              </div>
            )}
          </div>
          <WalletMultiButton
            style={{
              background: "#0f172a",
              borderRadius: "8px",
              fontSize: "14px",
              height: "36px",
            }}
          />
        </nav>
      </div>
    </header>
  );
}
