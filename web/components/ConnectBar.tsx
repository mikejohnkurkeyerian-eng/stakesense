"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

// WalletMultiButton uses browser-only APIs; load it client-only.
const WalletMultiButton = dynamic(
  async () =>
    (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

export default function ConnectBar() {
  return (
    <header className="border-b bg-white sticky top-0 z-40">
      <div className="container mx-auto px-6 py-3 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg">
          stakesense
        </Link>
        <nav className="flex gap-6 items-center text-sm">
          <Link
            href="/validators"
            className="text-slate-600 hover:text-slate-900"
          >
            Validators
          </Link>
          <Link href="/stake" className="text-slate-600 hover:text-slate-900">
            Stake
          </Link>
          <Link
            href="/backtest"
            className="text-slate-600 hover:text-slate-900"
          >
            Backtest
          </Link>
          <Link
            href="/methodology"
            className="text-slate-600 hover:text-slate-900"
          >
            Methodology
          </Link>
          <a
            href={`${process.env.NEXT_PUBLIC_API_BASE}/docs`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-600 hover:text-slate-900"
          >
            API ↗
          </a>
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
