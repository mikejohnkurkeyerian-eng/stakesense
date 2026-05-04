# Phantom — Stakesense Bounty Submission

**Project:** Stakesense — Predictive Validator Quality Oracle
**Live:** https://stakesense-el77-git-main-california-mortgage-solutions.vercel.app
**Repo:** https://github.com/mikejohnkurkeyerian-eng/stakesense
**Hackathon:** Solana Frontier (Colosseum), 2026
**Builder:** Mike (mikejohnkurkeyerian-eng)
**Contact:** mikejohnkurkeyerian@gmail.com

---

## What we built

Stakesense is an open-source ML oracle that scores every active Solana mainnet validator on three pillars (downtime risk, MEV tax, decentralization). The Phantom integration turns the oracle's recommendations into a one-click stake flow — pick a risk profile, see the top picks, click to delegate, sign in Phantom.

**The Phantom-specific surfaces:**

1. `/stake` — full Phantom wallet-adapter integration with `@solana/wallet-adapter-react`, `WalletMultiButton`, devnet airdrop helper, and a recommended-validator picker
2. `/portfolio` — pulls the connected Phantom wallet's stake accounts via RPC, scores each delegation, surfaces concentration risk, suggests rebalances. Read-only — no signing required, just the connected pubkey
3. **Connect-on-demand UX** — the wallet picker appears only when an action requires signing, so the dashboard is browsable without forcing a connection
4. **Auto-fill from connected wallet** on `/portfolio` — one click and the user's exposure analysis fills in
5. **Devnet-first** with explicit warm-up explainer, airdrop helper, and a 3-step "switch network" banner so users new to staking can finish the flow

**Why this is the most natural Phantom integration in the cohort:**
- Phantom is already the canonical Solana wallet for staking flows — most validator tools expose vote pubkeys but stop short of signing
- Stakesense wraps the *decision* (which validator?) and the *action* (delegate now) in one continuous flow, which is what Phantom is best at
- The `/portfolio` analyzer is unique — it transforms Phantom from a signing tool into a wallet that *understands* what it's delegating to

## Code references

- Wallet provider: `web/components/WalletProvider.tsx`
- Stake flow: `web/app/stake/page.tsx` (full delegate transaction, devnet airdrop)
- Portfolio analyzer (Phantom-aware): `web/app/portfolio/page.tsx`
- Connect bar component: `web/components/ConnectBar.tsx`

## What we'd build with the bounty

1. **Mainnet stake flow** — currently devnet-only; mainnet support is on the post-hackathon roadmap
2. **Phantom-only embedded experience** — `/stake/embedded` for Phantom mobile in-app browser
3. **Validator allow-listing UX** — let users mark "trusted" validators per-wallet (encrypted in browser storage)
4. **Real-time risk alerts** — push notifications via Phantom's notification surface when a delegation's risk score crosses a threshold

## Demo prompt for judges

1. Open https://stakesense-el77-git-main-california-mortgage-solutions.vercel.app
2. Click "Stake (devnet)"
3. Switch Phantom to devnet, connect, click "Airdrop 2 devnet SOL"
4. Pick the balanced risk profile, click "Get recommendations"
5. Click Stake on the top pick — Phantom signs — the tx confirms in Solana Explorer

For the portfolio side: visit `/portfolio`, click "Use connected wallet" — the dashboard analyzes every stake account, surfaces concentration warnings, and suggests rebalances based on stakesense's predictive scores.

## License & openness

- Code: MIT
- Data: CC-BY 4.0
- All Phantom integration code is public on GitHub. Anyone can fork, deploy their own backend, and rebrand.

## One-liner for the listing page

> Stakesense — open-source ML validator scoring with a Phantom-native one-click stake flow and a wallet-aware portfolio risk analyzer.
