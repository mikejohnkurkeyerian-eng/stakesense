# Colosseum submission — paste-and-go

Final-day reference. All fields filled in submission language. When you open the Colosseum form, copy each block into the matching field. The exact wording can shift — these are designed as drafts you'll lightly edit, not final copy.

---

## Project name
**stakesense**

## One-line pitch
Predictive ML scoring for every Solana validator — the open oracle for stakers, with an MCP server, embeddable widget, portfolio analyzer, migration simulator, and daily public-data exports.

## Detailed description (~500 words)

Stakesense is a public-goods data layer for Solana staking decisions. Every validator on the network is scored daily across three pillars:

- **Predicted downtime risk (7-day)** — a LightGBM classifier trained on rolling epoch performance flags validators likely to skip blocks or go delinquent before delegators notice.
- **MEV tax rate** — what share of MEV revenue an operator keeps vs passes through to delegators, normalized.
- **Decentralization score** — penalises stake that lives in over-represented data centers, ASNs, or geographies.

These pillars combine into a single composite score. Predictions, the model card, methodology, and full historical CSV/JSON snapshots are open under CC-BY 4.0. The whole codebase is MIT.

Stakesense ships as **a layered set of surfaces** so judges, builders, and end users meet it where they already are:

1. **A live web app** with validator browser, scoring detail, decentralization research dashboard, anomaly alerts, /research SVG charts, and a /playground that demos every public endpoint.
2. **An MCP server** (`stakesense-mcp` on npm) so Claude Desktop / Cursor / Claude Code can answer "where should I stake 100 SOL?" natively, with rich resources (model card, methodology, decentralization snapshot).
3. **An embeddable widget** — both a vanilla `<script>` drop-in and a React npm package (`@stakesense/react-widget`) — so any Solana site can render scores in seconds.
4. **A portfolio analyzer** at `/portfolio` that pastes any wallet and returns scored holdings, concentration risk, rebalance suggestions, and a one-click auto-optimizer ("maximize composite while minimizing churn").
5. **A migration simulator** at `/simulate` — what-if rebalances with composite/downtime/decentralization deltas + insights.
6. **A multisig staker** at `/stake/multisig` for DAO treasuries (Squads/Realms-compatible).
7. **A developer hub** at `/developers` exposing OpenAPI 3.1 + Postman v2.1 + curl quickstart.
8. **An alert layer**: Discord & Slack webhook posters for anomalies, a Bluesky daily-digest scaffold, a watch-validator subscription model with cron-driven dispatch, an HTML email digest with Resend integration, and a reusable GitHub Actions workflow other projects can call to monitor their own validators in CI.
9. **A confidential-staking roadmap stub** at `/api/v1/private/recommend` showing how the same scoring would run inside Arcium MPC so stakers can ask "where should I delegate?" without leaking amount or risk profile.

Stakesense is solo-built in 14 days for the Colosseum hackathon. 80+ commits, 105 passing api tests + 17 mcp + 2 react-widget + portfolio integration tests against live RPC, Vercel + Render + Supabase deploy, GitHub Actions cron refresh twice daily, Phantom wallet integration on /stake (devnet), Privy email/social as alternative auth.

Why it wins: it's the only validator-quality layer that's simultaneously public-data infrastructure, agent-native (MCP), embeddable (widget), portfolio-aware, alert-capable, and CI-ready. Each surface widens the audience and the integration story.

## Categories targeted
- Public Goods ($10k tier) — open data + open code + open methodology
- Top-20 Standout ($10k tier)
- Sponsor bounties: Phantom, Privy, Squads, Solana Foundation, Arcium (roadmap stub)

## Demo URL
https://stakesense-el77-git-main-california-mortgage-solutions.vercel.app

## API
https://stakesense.onrender.com/api/v1/health

## Repo
https://github.com/mikejohnkurkeyerian-eng/stakesense (MIT)

## MCP server
`npm i -g stakesense-mcp` · published

## React widget
`npm i stakesense-react-widget` · published

## Demo video
TBD — 2 min, follow `docs/DEMO_SCRIPT.md`

## Tech stack
Next.js 16 · FastAPI · Postgres (Supabase) · LightGBM · TypeScript · Tailwind v4 · Phantom · Privy · MCP SDK · GitHub Actions · Vercel · Render

## Sponsor integrations
Phantom (live, devnet stake) · Privy (email/social auth, ready when env var is set) · Squads-compatible multisig stake-tx generator · Solana Foundation public-goods data exports.
