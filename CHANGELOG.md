# Changelog

All notable changes to stakesense. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Version `0.1.0` is the hackathon submission cut.

## [0.4.0] — 2026-05-04 (Day 4 of finishing sprint)

### Added
- **Embeddable widget** (`web/public/widget.js`) — vanilla JS, no deps, drop in any site with one `<script>` + `<div data-stakesense-validator>`
- **`/widget`** showcase page with live tabbed preview, attribute reference, copy-paste embed code
- Themes (light/dark) and sizes (full/compact) on the widget; color-coded score gradient

## [0.3.0] — 2026-05-04 (Day 3 of finishing sprint)

### Added
- **Portfolio analyzer** — `/api/v1/portfolio/{owner_pubkey}` enumerates stake accounts via RPC, scores delegations, computes concentration metrics, suggests rebalances
- **`/portfolio`** page — wallet input + auto-fill from connected wallet, risk-finding cards, suggested rebalances table, full position breakdown
- 9 portfolio scoring tests (32 total in api/)

## [0.2.0] — 2026-05-04 (Day 2 of finishing sprint)

### Added
- **`stakesense-mcp`** — Model Context Protocol server for Claude Desktop, Claude Code, Cursor (8 tools, 5 resources, npm package)
- **`/integrations/mcp`** — install instructions for Claude / Cursor, tool reference, example prompts
- 13 MCP tests (vitest)
- pnpm workspace expanded to include `mcp/`

## [0.1.0] — 2026-05-04 (Day 1 of finishing sprint)

### Added
- **Submission packet** — `docs/SUBMISSION.md`, `docs/DEMO_SCRIPT.md`, `docs/METHODOLOGY.md`, sponsor bounty drafts in `docs/bounties/`
- **`/about`** page — mission, methodology summary, public-data ethos
- **`/data`** page — public CC-BY 4.0 download hub
- **`/api/v1/export/*`** — predictions.csv, predictions.json, validators.csv, decentralization.json, manifest.json
- **Privy** email/social login as alternative to Phantom on `/stake` (dynamic-loaded; no-op without `NEXT_PUBLIC_PRIVY_APP_ID`)
- **JSON-LD enrichment** — Dataset + Organization schemas alongside WebApplication
- **README rewrite** — mermaid architecture diagram, FAQ, sponsor stack table, badge row
- 5 export-endpoint tests
- pnpm override pinning `@solana/kit` to `^5.5.1` to fix Privy/`@solana-program/token` version mismatch

### Notes
- 7-day victory roadmap committed at `docs/ROADMAP.md`
- 32/32 api tests passing, 13/13 mcp tests passing

---

## Pre-finishing-sprint history (2026-04-28 → 2026-04-29)

The first ~14 days were a single-developer build: ~38 commits in one day on 2026-04-29 took the project from "scaffold" to "live and self-updating." Highlights:

### Infrastructure
- Postgres schema + migrations (Supabase) — 4 tables: validators, epoch_performance, mev_observations, predictions
- FastAPI service with /health, /validators, /recommend, /backtest, /stats, /clusters
- Render deploy (`render.yaml` blueprint)
- Vercel deploy (Next.js 16 + Tailwind 4 + shadcn/ui)
- GitHub Actions cron — refresh + retrain + predict, 2x/day

### Data pipeline
- Solana RPC client (Helius) — getVoteAccounts, getBlockProduction
- Jito Kobe API integration — MEV commission per validator
- validators.app metadata enrichment — data_center, ASN, country
- Rolling-window feature engineering (5-epoch skip stats, vote latency, credits)

### Modeling
- LightGBM downtime classifier with walk-forward eval
- LightGBM MEV-tax regressor with deterministic fallback
- Rule-based decentralization scorer (cluster size + superminority penalty)
- Composite weights documented in `MODEL_CARD.md`

### Frontend (8 pages)
- `/` landing with stat cards + top-3 recommendations
- `/validators` sortable + searchable table
- `/validators/[vote_pubkey]` detail page with recharts history
- `/compare` side-by-side comparison
- `/stake` Phantom-integrated devnet stake flow
- `/backtest` strategy comparison
- `/methodology` plain-English explainer
- 404 + error boundary pages

### Polish
- Tie-broken validator sort (commission ASC, stake ASC) so top-N differentiates while metadata empty
- OG image, Twitter card meta, sitemap, robots.txt
- Footer with not-investment-advice disclaimer
- Nakamoto coefficient surfaced on /stats + landing

### Tests + verification
- 18 → 32 → 45 (with mcp) tests passing
- Schema-safe test fixtures (sentinel pubkey, never trampling production data)
- End-to-end cron run verified (run 25151668641, 776 validators upserted, 3903 epoch rows, 728 MEV rows, 776 predictions)

---

**Velocity reference:** ~70 commits across 6 calendar days. From `git init` to public-goods open-data oracle in 14 days, solo.
