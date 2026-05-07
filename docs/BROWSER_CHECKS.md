# Browser-only checks before submission

These can't be done autonomously — they need a real browser, a real wallet,
and your eyes on the screen. Total budget: ~15 minutes. Run sequentially,
tick the boxes as you go.

**Live URL:** https://stakesense-el77-git-main-california-mortgage-solutions.vercel.app

If you spot a bug, screenshot it and paste the path here so it gets queued
for the next session.

---

## 1. Landing page sanity (1 min)

- [ ] Open the live URL in a clean Chrome window (no extensions blocking)
- [ ] Stats grid populates within 5–10 seconds (Render cold-start delay is normal)
- [ ] **NEW: validator search** — type two characters in the search box under the hero. A dropdown of matches should appear. Click one → lands on `/validators/{pk}`.
- [ ] **NEW: paste-pubkey detection** — paste any vote pubkey directly into the search box. Dropdown should show "Open validator …" instead of name search.
- [ ] Top-3 recommendations card renders three validators with composite scores
- [ ] "What changed recently" section shows ≥1 anomaly card

## 2. Validator detail + new OG card (1 min)

- [ ] Click into any validator from the search box or recommendations card
- [ ] Score breakdown bars render (3 weighted pillars + composite)
- [ ] History chart renders (recharts, or graceful empty state if no history)
- [ ] **NEW: per-validator OG image** — copy the URL, paste it into a Discord message or X compose box. The link preview should show a custom card with the validator's name + scores. (You can also visit `/validators/{pk}/opengraph-image` directly to see the raw PNG.)

## 3. /portfolio with your real wallet (3 min)

- [ ] Open `/portfolio`
- [ ] Connect Phantom (or paste your wallet pubkey directly)
- [ ] Click "Use connected wallet"
- [ ] Stake accounts list populates (or empty state if you have no stake accounts)
- [ ] Concentration breakdown by data center / ASN / country renders
- [ ] **NEW: copy-share-link button** appears after the report loads — click it; clipboard should now contain `?wallet=…&optimize=…`
- [ ] Paste that URL in a new tab — the same analysis loads automatically without re-entering the pubkey
- [ ] **Optimizer button** — click "Find best moves"; suggested rebalances render with from/to columns

## 4. /simulate with auto-fill (2 min)

- [ ] Open `/simulate`
- [ ] Click "Load example (mid-tier → top-tier)"
- [ ] **NEW: violet "Auto-fill After" panel** is visible
- [ ] Pick "Maximize composite", click "Find best swap" — the After column populates with optimizer output and the deltas render automatically
- [ ] Try the other two objectives (downtime, decentralization) — After column changes, deltas update
- [ ] Optimizer notes panel appears (e.g. "No swaps cleared the threshold" if portfolio is already optimal)

## 5. /operator dashboard with watch opt-in (2 min)

Pick any vote pubkey (e.g. one from your portfolio, or just grab one from /validators).

- [ ] Open `/operator/{vote_pubkey}`
- [ ] Rank cards + percentile + gap-to-top-10 render
- [ ] "What would improve your score" suggestions list renders
- [ ] **NEW: violet "Watch this validator" panel** appears under the header
- [ ] Click "Set up alert" → form expands
- [ ] Fill in a test webhook (you can use https://webhook.site/ for a throwaway)
- [ ] Pick a preset, click "Register watch" — should show a green "✓ Watch #N registered" confirmation

## 6. /stake on devnet (5 min) — Phantom only

This is the critical wallet-signing flow. Skip if Phantom isn't installed.

- [ ] Switch Phantom to **devnet** (Settings → Developer Settings → Change Network → devnet)
- [ ] Open `/stake`
- [ ] Connect Phantom — wallet pubkey should appear in the connect bar
- [ ] If devnet balance is 0, click "Airdrop 2 devnet SOL" — wait ~5s for confirmation
- [ ] Pick a balanced risk profile, click "Get recommendations" — top picks render
- [ ] Click "Stake" on the top pick → Phantom modal opens with a delegate transaction
- [ ] Approve in Phantom — transaction signature appears; click through to Solana Explorer to confirm

If anything fails here, **stop and screenshot the Phantom error message** — the most likely cause is a network mismatch or a stale session.

## 7. /api/v1/private/recommend (Arcium stub) (30s)

- [ ] In a new tab, paste:
   ```
   curl -X POST https://stakesense.onrender.com/api/v1/private/recommend \
     -H "Content-Type: application/json" \
     -d '{"amount_sol": 100, "risk_profile": "balanced", "count": 3}'
   ```
   in a terminal. Or use the `/playground` page if you prefer a UI.
- [ ] Response should have `recommendations`, `confidentiality.status: "stub"`, and an `echo` of the inputs

## 8. PWA install prompt (1 min, opportunistic)

- [ ] After you've used the site for ~30 seconds, watch the bottom-right corner — Chrome may show the **NEW** install banner
- [ ] If it doesn't appear, manually install via Chrome menu → "Install stakesense"
- [ ] Confirm the home-screen icon renders (gradient with an "s")

---

## Quick sanity ping (15s)

```
curl -sS https://stakesense.onrender.com/api/v1/health | jq
```

Response should include `ok: true`, a recent `last_update_epoch`, and a recent `last_prediction_date`.

---

## When you're done

Tick everything green and you're submission-ready. The remaining items are:

- Record the 2-min demo video per `docs/DEMO_SCRIPT.md`
- Run Lighthouse: `PSI_API_KEY=… ./scripts/run_lighthouse.sh`
- Submit to Colosseum using `docs/COLOSSEUM_FORM.md`
- Submit each sponsor bounty using the drafts in `docs/bounties/`
