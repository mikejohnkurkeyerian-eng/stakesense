# Morning briefing — 2026-05-04

> What I built while you slept, what you need to do today, and what's queued for tonight.

---

## TL;DR

**Days 1–4 of the 7-day roadmap shipped in one session.** ~9 commits. ~4,000 lines added. 32/32 api tests passing, 13/13 mcp tests passing. Builds clean. Push to main was blocked by your permission rule — first thing to do is `git push origin main`.

Submission deadline: **2026-05-11** (~7 days). With this work, you're in great shape for Public Goods + Standout 20 + multiple sponsor bounties.

---

## What got built

### Day 1 — Submission packet + Privy + open data
- `docs/SUBMISSION.md` — judge-ready project overview
- `docs/DEMO_SCRIPT.md` — 2-min video walkthrough with shot list
- `docs/METHODOLOGY.md` — long-form companion to `MODEL_CARD.md`
- README rewrite with mermaid architecture diagram, FAQ, sponsor table
- `/about` page — mission, methodology summary
- `/data` page — public CC-BY 4.0 download hub
- `/api/v1/export/*` — predictions.csv, predictions.json, validators.csv, decentralization.json, manifest.json
- **Privy** dynamic-loaded, no-op without `NEXT_PUBLIC_PRIVY_APP_ID` (build issues from `@solana-program/token` fixed via pnpm override on `@solana/kit ^5.5.1`)
- JSON-LD enriched with Dataset + Organization schemas

### Day 2 — MCP server (npm: `stakesense-mcp`)
- `mcp/` workspace package with 8 tools, 5 resources
- Tools: `get_validator_score`, `recommend_top_validators`, `list_validators`, `get_validator_history`, `get_decentralization_report`, `get_concentration_by`, `get_network_stats`, `health_check`
- Resources: methodology, model-card, manifest, network-stats, decentralization
- `/integrations/mcp` showcase page with copy-paste install
- 13 vitest tests passing

### Day 3 — Portfolio analyzer
- `/api/v1/portfolio/{owner_pubkey}` — pulls stake accounts via RPC, scores delegations, computes concentration, suggests rebalances
- `/portfolio` page — wallet input + auto-fill, risk findings, suggested rebalances, concentration buckets
- 9 portfolio scoring tests

### Day 4 — Embeddable widget
- `web/public/widget.js` — vanilla JS, no deps, themes (light/dark), sizes (full/compact)
- `<div data-stakesense-validator>` and `<div data-stakesense-top>`
- `/widget` showcase page with live tabbed preview

### Bonus — Sponsor bounty drafts
- `docs/bounties/phantom.md`
- `docs/bounties/privy.md`
- `docs/bounties/solana_foundation.md` ← biggest tier ($10k Public Goods)
- `docs/bounties/squads.md`
- `docs/bounties/README.md` with submission checklist + recommended order

### Bonus — Public-goods polish
- `CHANGELOG.md` documenting velocity + feature waves
- `CONTRIBUTING.md`
- `SECURITY.md` + `.well-known/security.txt`
- PWA manifest at `/manifest.webmanifest` + viewport theme color

---

## What you must do today (humans only)

In rough priority order:

### Critical
1. **`git push origin main`** — release tonight's commits to Vercel + Render. The current git tree has these commits ready locally; your permission policy blocked the autonomous push.
2. **Get a Privy app ID** at https://dashboard.privy.io and set `NEXT_PUBLIC_PRIVY_APP_ID` in:
   - Vercel project settings (Environment Variables)
   - Local `web/.env.local` if you'll dev-test
3. **Test `/stake` end-to-end on devnet** with Phantom (browser-only — I can't sign transactions)
4. **Test `/portfolio`** with your real wallet (paste your pubkey, see if the analyzer surfaces anything reasonable)

### Important
5. **Skim and edit voice** on:
   - `docs/SUBMISSION.md`
   - `docs/DEMO_SCRIPT.md`
   - `docs/METHODOLOGY.md`
   - `docs/bounties/*.md`
   - `README.md`
   I wrote in your voice as best I could — but it's worth a 15-minute pass to make sure nothing reads like "AI wrote this."
6. **Test the widget on a personal site or codepen** — paste `<script src="…/widget.js"></script>` plus a `<div data-stakesense-validator="VOTE_PUBKEY">`
7. **Verify `https://stakesense-el77-git-main-california-mortgage-solutions.vercel.app/integrations/mcp` looks good** after Vercel redeploys

### Nice to have
8. **Test Privy login** on `/stake` once the app ID is set — log in with email, see if a Privy-embedded wallet gets created
9. **Test MCP server locally**:
   ```
   claude mcp add stakesense -- npx --workspace=stakesense-mcp run dev
   ```
   Or build it first: `cd mcp && pnpm build`, then `claude mcp add stakesense -- node /absolute/path/to/mcp/dist/index.js`
10. **`npm publish stakesense-mcp`** — when ready, but only after a final review (I deferred publishing to give you the green light first)

---

## What's queued for tonight (Day 5+)

If you keep me running tonight, the natural next moves:

### Day 5 candidates
- **Squads multisig staking** — `/stake/dao` flow constructing Squads-V4-compatible serialize-then-paste transactions. Sponsor bounty target. Risky to ship without browser testing — better to scaffold + leave for daytime verification.
- **Operator dashboard** — `/operator/[vote_pubkey]` for validators to see their own score breakdown + improvement suggestions. Two-sided market story for judges.
- **Anomaly detection** — flag validators with sudden commission/MEV/skip-rate changes
- **Stake migration simulator** — paste portfolio, see "if you moved X SOL from A to B, weighted composite goes 0.62 → 0.78"

### Day 6 polish
- Lighthouse audit + image optimization
- Better mobile responsive
- More API tests
- Twitter announcement post draft
- Discord webhook scaffold for staker alerts (defers to your webhook URL)

### Day 7 final
- Final README pass with Lighthouse scores + GIF screenshots
- Submission packet ready to paste
- Memory + commit log fully up-to-date

---

## Things I noticed that need attention

- **Vercel deploys depend on you pushing.** Until you `git push origin main`, the live site won't reflect any of tonight's work.
- **Render deploys (the API) also redeploy on push** via render.yaml. After push, watch Render's build log for any cold-start issues; new endpoints (`/api/v1/export/*`, `/api/v1/portfolio/*`) need to come online.
- **The /stake page on the live site is devnet only.** Memory says you flagged this for post-hackathon — keep it that way; mainnet support is a sprint.
- **Squads is the biggest sponsor surface I deferred** because it needs a real multisig to test against. If you can spin up a test Squads multisig today, I can ship the integration tonight.

---

## Files to look at first

Quickest read in 10 minutes:
1. `docs/SUBMISSION.md` — does this sell the project the way you want?
2. `docs/bounties/solana_foundation.md` — $10k tier, biggest single submission
3. `README.md` — judges and sponsors land here first
4. The new `/portfolio` page in browser — does it feel useful?
5. The new `/integrations/mcp` page — does the install copy work?

---

## Numbers as of this commit

- **Files added/changed tonight:** ~30 files, ~4,000 lines
- **Tests:** 32 (api) + 13 (mcp) = 45 passing
- **Commits since start of finishing sprint:** 9
- **Routes (web app):** 17 (including /widget, /portfolio, /integrations/mcp, /about, /data)
- **API endpoints:** /health, /validators, /validators/{pk}, /validators/{pk}/predictions, /validators/stats, /validators/clusters, /recommend, /backtest, /portfolio/{pk}, /export/predictions.csv, /export/predictions.json, /export/validators.csv, /export/decentralization.json, /export/manifest.json
- **MCP tools:** 8
- **MCP resources:** 5
- **Validators in DB:** 789 (752 with full geographic metadata after Day 1's cron run)
- **Bounty drafts:** 4 (Phantom, Privy, Solana Foundation, Squads)

---

When you're ready for tonight's session, the roadmap is in `docs/ROADMAP.md`. Memory at `~/.claude/projects/.../memory/hackathon_finalweek_progress.md` has the latest state.

Sleep well — this thing is *real*.
