import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t bg-white mt-16">
      <div className="container mx-auto px-6 py-8 text-sm text-slate-500 grid grid-cols-1 md:grid-cols-4 gap-6">
        <div>
          <div className="font-bold text-slate-900 mb-2">stakesense</div>
          <p className="text-xs">
            Predictive validator quality oracle for Solana. Open-source
            (MIT) under the Public Goods tier of Solana Frontier 2026.
          </p>
        </div>
        <div>
          <div className="font-semibold text-slate-700 mb-2">Product</div>
          <ul className="space-y-1">
            <li>
              <Link href="/validators" className="hover:text-slate-900">
                Validators
              </Link>
            </li>
            <li>
              <Link href="/stake" className="hover:text-slate-900">
                Stake (devnet)
              </Link>
            </li>
            <li>
              <Link href="/backtest" className="hover:text-slate-900">
                Backtest
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <div className="font-semibold text-slate-700 mb-2">Docs</div>
          <ul className="space-y-1">
            <li>
              <Link href="/methodology" className="hover:text-slate-900">
                Methodology
              </Link>
            </li>
            <li>
              <a
                href="https://github.com/mikejohnkurkeyerian-eng/stakesense/blob/main/MODEL_CARD.md"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-slate-900"
              >
                Model Card ↗
              </a>
            </li>
            <li>
              <a
                href={`${process.env.NEXT_PUBLIC_API_BASE}/docs`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-slate-900"
              >
                API ↗
              </a>
            </li>
          </ul>
        </div>
        <div>
          <div className="font-semibold text-slate-700 mb-2">Source</div>
          <ul className="space-y-1">
            <li>
              <a
                href="https://github.com/mikejohnkurkeyerian-eng/stakesense"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-slate-900"
              >
                GitHub ↗
              </a>
            </li>
            <li>
              <a
                href="https://colosseum.com/frontier"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-slate-900"
              >
                Solana Frontier ↗
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t">
        <div className="container mx-auto px-6 py-4 text-xs text-slate-400">
          Predictions are not investment advice. Composite weights (0.5 / 0.3
          / 0.2) are a transparent default; re-weight to your own preferences.
        </div>
      </div>
    </footer>
  );
}
