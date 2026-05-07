# Punchlist — 2026-05-07 onwards

Today is **2026-05-07**. **Submission deadline: 2026-05-11** (4 days remaining).

This file is the standing punchlist. Picked up wherever the last session ended.

---

## Tier 0 — manual follow-ups owed by the human (no code, just clicks)

- [x] **Run `python api/scripts/migrate.py`** — `watch_subscriptions` table is now live (migrated 2026-05-06).
- [x] **Publish `stakesense-mcp@0.2.0`** — already on npm (verified `npm view`).
- [x] **Publish `stakesense-react-widget@0.1.0`** — already on npm (verified `npm view`).
- [ ] **Set `NEXT_PUBLIC_PRIVY_APP_ID` in Vercel** — Privy email/social login is wired but no-ops until this env var is set. App ID at https://dashboard.privy.io.
- [ ] **Run `docs/BROWSER_CHECKS.md`** — ~15-min sequential walkthrough covering `/stake` devnet, `/portfolio` connected-wallet, `/simulate` auto-fill, `/operator` watch opt-in, PWA install, and the Arcium stub.
- [x] **Skim `docs/COLOSSEUM_FORM.md`** — refreshed and paste-ready.
- [x] **Skim `docs/SUBMISSION.md`** — refreshed.

## Tier 1 — high-leverage features remaining

All shipped 2026-05-07.

- [x] **Operator alert opt-in on /operator/[vote_pubkey]**
- [x] **/portfolio share link** (`?wallet=…&optimize=…`)
- [x] **OG image generator for /validators/{pk}**
- [x] **Compare API endpoint** (`/api/v1/compare?vs=A,B,C`)
- [x] **/simulate "find best swap" mode** (`POST /api/v1/simulate/optimize`)
- [x] **Validator search box on landing**

## Tier 2 — public-goods polish + sponsor surfaces

- [ ] **Squads V4 SDK integration on /stake/multisig** — generic serialize-and-paste works today; native SDK is the bounty target.
- [x] **Arcium confidential queries stub** — `POST /api/v1/private/recommend` with a confidentiality envelope describing the production target.
- [ ] **Better `country` ingest** — needs live DB inspection to tighten the ASN→ISO mapping. Deferred.
- [x] **Daily digest email design** — `api/src/stakesense/digest.py` + `scripts/send_daily_digest.py` with deferred Resend integration.
- [x] **PWA install prompt + apple-touch-icon** — `web/components/PWAInstallPrompt.tsx` + dynamic `/icon` and `/apple-icon`.

## Tier 3 — submission-day operational checklist

- [x] **Sponsor bounty drafts refreshed** — `docs/bounties/{phantom,privy,squads,solana_foundation,arcium}.md` paste-ready.
- [x] **Demo script refreshed** — `docs/DEMO_SCRIPT.md` updated for current surfaces.
- [x] **Lighthouse runner wired** — `scripts/run_lighthouse.sh`.
- [ ] **Run Lighthouse** — `PSI_API_KEY=… ./scripts/run_lighthouse.sh` (free key at https://developers.google.com/speed/docs/insights/v5/get-started).
- [ ] **Record 2-min demo video** per `docs/DEMO_SCRIPT.md`.
- [ ] **Upload to YouTube/Loom (unlisted)**.
- [ ] **Submit to Colosseum** with copy from `docs/COLOSSEUM_FORM.md`.
- [ ] **Submit each sponsor bounty** using drafts in `docs/bounties/`.
- [ ] **Tweet announcement thread** per `docs/TWITTER_DRAFTS.md` (or skip).

## Tier 4 — nice-to-haves if time permits

- [ ] Stake migration simulator: presets for "conservative", "balanced", "decentralized"
- [ ] Validator detail page: epoch-by-epoch chart of skip rate / commission
- [ ] /backtest: CSV export
- [ ] CLI tool (`npx stakesense status <pubkey>`)
- [ ] Webhook CRUD UI on /developers (manage your own watches in browser)

---

## Notes / known limitations

- **Country filter**: data has dirty country values (raw hostname segments mixed in). Filter API is correct; ingest is the issue. Deferred — not blocking submission.
- **Render free tier**: API cold-starts ~30–60s after idle. `/api/v1/health` warmup ping fires on every page load to keep it warm.
- **Privy**: needs `NEXT_PUBLIC_PRIVY_APP_ID` in Vercel before email/social login renders. Without it the component no-ops gracefully.
- **Daily digest email**: needs `RESEND_API_KEY` + `DIGEST_RECIPIENTS` in CI secrets to actually send. Without those, the script renders to stdout for dry-run.

## Test status (as of 2026-05-07)

- **api:** 105/105 passing
- **mcp:** 17/17 passing
- **react-widget:** 2/2 passing
- **Total:** 124 tests, all green
