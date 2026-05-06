# Tomorrow's stack — 2026-05-06 onwards

Today is **2026-05-06**. **Submission deadline: 2026-05-11** (5 days remaining).

This file is the standing punchlist for the rest of the hackathon. Picked up wherever the last session ended.

---

## Tier 0 — manual follow-ups owed by the human (no code, just clicks)

These unblock features already shipped tonight.

- [ ] **`cd api && python scripts/migrate.py`** — adds `watch_subscriptions` table to the live Supabase DB. Until you run this, `/api/v1/watch` returns 500 and the 5 skipped tests stay skipped.
- [ ] **Publish `stakesense-mcp@0.2.0`** — `cd mcp && npm publish`. Adds `simulate_migration` tool. (First publish requires `npm login` if you haven't.)
- [ ] **Publish `@stakesense/react-widget@0.1.0`** — `cd packages/react-widget && npm publish`. New package — needs the `@stakesense` npm org to exist (or change the name to `stakesense-react-widget` if you don't want an org).
- [ ] **Set `NEXT_PUBLIC_PRIVY_APP_ID` in Vercel** — Privy email/social login is wired but no-ops until this env var is set. App ID at https://dashboard.privy.io.
- [ ] **Test `/stake` on devnet with Phantom** — browser-only verification, can't be done autonomously. ~5 min.
- [ ] **Test `/portfolio` with your real wallet** — sample wallets work; verify connected-wallet auto-fill.
- [ ] **Skim `docs/COLOSSEUM_FORM.md`** — paste-ready submission copy. Edit voice if needed.
- [ ] **Skim `docs/SUBMISSION.md` + `docs/METHODOLOGY.md`** — same, voice/edits.

## Tier 1 — high-leverage features remaining

Each ships in <1h, deployable, judges remember it.

- [ ] **Operator alert opt-in on /operator/[vote_pubkey]** — "watch this validator" button that posts to `/api/v1/watch` so operators can self-subscribe to anomaly alerts on their own pubkey. Two-sided market story.
- [ ] **/portfolio share link** — encode the wallet pubkey + objective into a shareable URL (`/portfolio?wallet=…&optimize=composite`) so users can DM "look at this analysis".
- [ ] **OG image generator for /validators/{pk}** — `app/validators/[vote_pubkey]/opengraph-image.tsx` returning a dynamic PNG with name + composite + Nakamoto. Each validator detail page becomes its own shareable card.
- [ ] **Compare API endpoint** — `/api/v1/compare?vs=A,B,C` returns side-by-side scoring rows. The /compare page calls it; MCP/widget can too.
- [ ] **Stake migration simulator: "find best swap" mode** — extend /simulate so a single button calls /optimize and pre-fills the After column. Closes the loop with /portfolio.
- [ ] **Validator search box on landing** — quick autocomplete so judges can paste any pubkey and land directly on a detail page.

## Tier 2 — public-goods polish + sponsor surfaces

- [ ] **Squads V4 SDK integration on /stake/multisig** — currently a generic serialize-and-paste flow. Real Squads SDK transaction construction would be a stronger sponsor bounty submission.
- [ ] **Arcium confidential queries stub** — `/api/v1/private/recommend` (or similar) showing a teaser of confidential rebalance compute. Pure stub if Arcium beta access not in hand.
- [ ] **Better `country` ingest** — current data has hostname-fragments mixed in (`fra1-lim1-g2-8k.de.eu` instead of `DE`). Tighten the ASN→ISO mapping in `enrich_metadata.py`. Filter UI on /validators is ready but underused while data is dirty.
- [ ] **Daily digest email design** — HTML template + a defer-to-user SES/Resend integration.
- [ ] **PWA install prompt + iOS metadata** — manifest is in place; add `apple-touch-icon` + a soft prompt on landing.

## Tier 3 — submission-day operational checklist

- [ ] **Record 2-min demo video** per `docs/DEMO_SCRIPT.md`
- [ ] **Upload to YouTube/Loom (unlisted)**
- [ ] **Submit to Colosseum** with copy from `docs/COLOSSEUM_FORM.md`
- [ ] **Submit each sponsor bounty** — drafts in `docs/bounties/`:
  - Phantom (devnet integration)
  - Privy (email/social auth, gated on Vercel env)
  - Squads (multisig stake-tx generator)
  - Solana Foundation (public-goods data + open MCP/widget/oracle stack)
- [ ] **Tweet announcement thread** per `docs/TWITTER_DRAFTS.md` (or skip Twitter and post on Bluesky once you've added the daily digest creds)
- [ ] **Lighthouse pass** with PSI API key — get scores for the README badge row

## Tier 4 — nice-to-haves if time permits

- [ ] Stake migration simulator: presets for "conservative", "balanced", "decentralized"
- [ ] Validator detail page: epoch-by-epoch chart of skip rate / commission
- [ ] /backtest: CSV export
- [ ] CLI tool (`npx stakesense status <pubkey>`)
- [ ] Webhook CRUD UI on /developers (manage your own watches in browser)

---

## Notes / known limitations

- **Country filter**: data has dirty country values (raw hostname segments mixed in). Filter API is correct; ingest is the issue.
- **Render free tier**: API cold-starts ~30-60s after idle. `/api/v1/health` warmup ping fires on every page load to keep it warm.
- **MCP v0.2.0 + react-widget v0.1.0**: built and tested locally; not yet on npm.
- **watch_subscriptions table**: in `schema.sql` but not migrated. `python scripts/migrate.py` to apply.
