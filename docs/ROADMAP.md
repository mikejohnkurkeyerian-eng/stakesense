# Stakesense — 7-Day Hackathon Victory Roadmap

**Today:** 2026-05-04 · **Submission deadline:** 2026-05-11 · **Days remaining:** 7

**Current state:** Live on Vercel + Render + Supabase. 789 validators, cron 2x/day, 18/18 tests passing. Validators.app token now configured (decentralization scores will spread on next refresh). Phantom wallet wired on /stake. Privy installed but not yet integrated.

**Win condition:**
- **Primary:** Top-20 standout slot ($10k) + Public Goods tier ($10k) = $20k
- **Stretch:** Sponsor bounties from Phantom, Privy, Squads, Arcium, Solana Foundation
- **Reach:** Top-3 standout / accelerator interview

**Strategy:** Layer differentiators no other Colosseum builder has — public-goods-grade open-data infrastructure + the only ML-driven validator oracle + an MCP server + a portfolio risk analyzer + an embeddable widget. Each new surface widens the "why this wins a bucket" story for judges.

---

## The seven differentiators (target outcome)

1. **Live ML oracle** — composite scoring with model card, methodology, backtest *(✅ done)*
2. **Public-data downloads** — daily CSV/JSON snapshots so anyone can audit / reuse *(Day 1)*
3. **MCP server** — Claude Desktop / Cursor can query validator quality natively *(Day 2)*
4. **Stake portfolio analyzer** — paste any wallet, see exposure, concentration, recommended rebalances *(Day 3)*
5. **Embeddable widget** — `<script>` tag any Solana site can drop in for validator scores *(Day 4)*
6. **Squads multisig staking** — DAO-friendly stake flow (sponsor bounty surface) *(Day 5)*
7. **Arcium confidential queries / Phantom polish** — pick one and ship deeply *(Day 6)*

Day 7 = recording, polish, submit.

---

## Day 1 — Tonight (2026-05-04 → 2026-05-05) — autonomous

**Goal:** Submission packet + Privy + first sponsor surface + open data infra.

### Tasks
- [ ] T1.1 — Submission packet (`docs/SUBMISSION.md`) — judge-friendly project overview, win narrative, screenshots inventory
- [ ] T1.2 — Demo script (`docs/DEMO_SCRIPT.md`) — exact 2-min video walkthrough with shot list
- [ ] T1.3 — README rewrite — architecture diagram (mermaid), FAQ, demo flow, sponsor stack table
- [ ] T1.4 — `/about` page — mission, methodology summary, team (solo), open-data ethos
- [ ] T1.5 — Privy integration — alternative auth on /stake, gracefully degrades without APP_ID, badge "Email or Phantom"
- [ ] T1.6 — Open data endpoints — `/api/v1/export/predictions.csv`, `/export/validators.csv`, `/export/decentralization.csv`
- [ ] T1.7 — Public data download page `/data` — links to exports, schemas, license, attribution
- [ ] T1.8 — Methodology paper (`docs/METHODOLOGY.md`) — long-form writeup of feature engineering, training, scoring, backtest, limitations
- [ ] T1.9 — JSON-LD enrichment — Dataset schema, more entities for SEO/discovery
- [ ] T1.10 — Verify cron run completed; confirm ASN/data_center now populated

### Human follow-ups for Day 1 morning
- [ ] **H1.1** — Get Privy app ID at https://dashboard.privy.io → set `NEXT_PUBLIC_PRIVY_APP_ID` in Vercel
- [ ] **H1.2** — Test /stake with Phantom on devnet end-to-end (browser, signing required)
- [ ] **H1.3** — Test Privy email login on /stake (browser)
- [ ] **H1.4** — Skim `docs/SUBMISSION.md`, `docs/DEMO_SCRIPT.md`, `docs/METHODOLOGY.md` and approve / edit voice

---

## Day 2 — Night (2026-05-05 → 2026-05-06) — autonomous

**Goal:** Ship MCP server. Become "the validator oracle Claude/Cursor speak to."

### Tasks
- [ ] T2.1 — MCP server scaffold (`mcp/` workspace package, TypeScript)
- [ ] T2.2 — Tools: `get_validator_score(vote_pubkey)`, `recommend_top_n(n, weights?)`, `get_decentralization_report()`, `get_concentration_by(field)`, `get_validator_history(vote_pubkey, days)`, `get_nakamoto_coefficient()`
- [ ] T2.3 — Resources: validator catalog, predictions snapshot, methodology
- [ ] T2.4 — README in `mcp/` with `claude mcp add` install instructions
- [ ] T2.5 — Publish to npm as `stakesense-mcp` (defer publish until human approves)
- [ ] T2.6 — `/integrations/mcp` page on web app — install instructions, copy-paste config
- [ ] T2.7 — Unit tests for MCP tools
- [ ] T2.8 — Add MCP listing in submission packet + README

### Human follow-ups for Day 2 morning
- [ ] **H2.1** — `npm publish` `stakesense-mcp` after review (or approve publish)
- [ ] **H2.2** — Install MCP locally and verify Claude Desktop sees it: `claude mcp add stakesense -- npx stakesense-mcp`
- [ ] **H2.3** — Tweet about MCP launch (link to /integrations/mcp)

---

## Day 3 — Night (2026-05-06 → 2026-05-07) — autonomous

**Goal:** Stake portfolio analyzer. Differentiator that no other validator tool has.

### Tasks
- [ ] T3.1 — Backend: `/api/v1/portfolio/{owner_pubkey}` — pulls all stake accounts owned by wallet via RPC, scores each, returns concentration metrics
- [ ] T3.2 — Risk warnings — superminority exposure, ASN concentration, downtime-risk-weighted exposure
- [ ] T3.3 — Rebalance recommendations — "move X SOL from validator A to validator B because…"
- [ ] T3.4 — Frontend `/portfolio` — paste wallet, see scored breakdown, charts, recommendations
- [ ] T3.5 — "Connect wallet" auto-fill option (read-only)
- [ ] T3.6 — Backend tests for portfolio scoring
- [ ] T3.7 — Add to landing-page hero CTA

### Human follow-ups for Day 3 morning
- [ ] **H3.1** — Test /portfolio with your real wallet (browser)
- [ ] **H3.2** — Edit copy / examples if needed

---

## Day 4 — Night (2026-05-07 → 2026-05-08) — autonomous

**Goal:** Embeddable widget. Distribution multiplier — every Solana site that uses it advertises stakesense.

### Tasks
- [ ] T4.1 — Standalone JS bundle (`web/public/widget.js`) — `<script src="…/widget.js">` + `<div data-stakesense-validator="..."></div>` auto-renders score
- [ ] T4.2 — Widget API: by validator, top-N, by ASN, by country
- [ ] T4.3 — Theming: light/dark, sizes (compact/full), color overrides
- [ ] T4.4 — `/widget` showcase page with live preview + copy-paste embed code
- [ ] T4.5 — CORS open on relevant API endpoints
- [ ] T4.6 — Rate limiting tier for widget traffic
- [ ] T4.7 — Tests for widget rendering

### Human follow-ups for Day 4 morning
- [ ] **H4.1** — Test embed on a personal site / codepen
- [ ] **H4.2** — Reach out to 2-3 Solana projects (Discord/Twitter DM) offering widget integration

---

## Day 5 — Night (2026-05-08 → 2026-05-09) — autonomous

**Goal:** Squads multisig staking flow + sponsor bounty submission.

### Tasks
- [ ] T5.1 — Research Squads SDK + multisig stake instruction format
- [ ] T5.2 — `/stake/dao` page — flow that constructs Squads-compatible stake transaction
- [ ] T5.3 — Multisig account input, validator picker (using stakesense recommendations), amount, transaction preview
- [ ] T5.4 — Generate Squads-ready transaction blob (sign-later flow)
- [ ] T5.5 — Documentation: "How DAOs use stakesense"
- [ ] T5.6 — Sponsor bounty submission draft for Squads
- [ ] T5.7 — Add DAO treasury angle to landing page narrative

### Human follow-ups for Day 5 morning
- [ ] **H5.1** — Test Squads flow with a test multisig (browser + wallet)
- [ ] **H5.2** — Submit Squads bounty form

---

## Day 6 — Night (2026-05-09 → 2026-05-10) — autonomous

**Goal:** Final polish + performance + bonus surface (pick one based on Day-5 progress).

### Tasks
- [ ] T6.1 — Lighthouse pass — target 95+ on landing, validators, /portfolio
- [ ] T6.2 — PWA manifest + icons → installable
- [ ] T6.3 — Mobile responsive audit (every page)
- [ ] T6.4 — Add OpenAPI spec download + Postman collection
- [ ] T6.5 — Twitter bot scaffold (`scripts/post_daily_nakamoto.py`) — needs token from user
- [ ] T6.6 — Optional: Arcium private query stub (if Squads slid to here, pick one)
- [ ] T6.7 — Cross-browser test inventory
- [ ] T6.8 — All sponsor bounty submission drafts ready in `docs/bounties/`
- [ ] T6.9 — Daily digest email design (defer send infrastructure to user)

### Human follow-ups for Day 6 morning
- [ ] **H6.1** — Get Twitter API token (if interested) → bot can run from cron
- [ ] **H6.2** — Final review of all sponsor bounty drafts before submitting
- [ ] **H6.3** — Test PWA install on phone

---

## Day 7 — Night + Day (2026-05-10 → 2026-05-11) — autonomous + human

**Goal:** Submit and win.

### Autonomous (night)
- [ ] T7.1 — Final README pass with Lighthouse scores, GIF screenshots, badge row
- [ ] T7.2 — All bounty drafts finalized, ready for paste-and-submit
- [ ] T7.3 — Submission form draft for Colosseum (everything ready to paste)
- [ ] T7.4 — Memory + commit log fully up-to-date

### Human (day)
- [ ] **H7.1** — Record 2-min demo video per `docs/DEMO_SCRIPT.md`
- [ ] **H7.2** — Upload video to YouTube/Loom (unlisted)
- [ ] **H7.3** — Submit to Colosseum
- [ ] **H7.4** — Submit each sponsor bounty (Phantom, Privy, Squads, Solana Foundation, etc.)
- [ ] **H7.5** — Tweet announcement thread linking to demo + repo

---

## Quality bars (every night)

- All tests must pass before each commit. If they don't, I stop, do not bypass.
- Each completed task = 1 commit, scoped narrowly.
- No destructive ops (no force push, no DB drops, no key changes) — those wait for you.
- Render API must stay green. Vercel deploys must stay green. If either breaks, I stop and write a recovery note.
- Memory updated at end of each night with progress + blockers + what's queued.

## What I won't do autonomously (require you)
- Browser-only verification (wallet flows, Phantom signing, Privy email, real device PWA install)
- External account creation (Privy app, Twitter dev account, Squads test multisig, Arcium beta)
- Public posting (tweets, Discord messages, sponsor form submissions, Colosseum submission)
- Spending real SOL or signing transactions on mainnet
- Changing GitHub permissions / deleting branches / amending pushed commits

## Daily rhythm

- **Night** (you sleep): I execute that day's task list end-to-end, commit, update memory, leave a "morning briefing" note
- **Morning** (you wake up): Read briefing, do the human follow-ups, give green light for the next night's work
- **Day**: You handle browser/wallet/external-account stuff, send tweets, talk to sponsors

If we keep this rhythm we hit submission with seven layered differentiators, an MCP, an open-data story, a portfolio analyzer, an embeddable widget, sponsor bounties, and a polished demo. That's the package judges remember.

Let's go.
