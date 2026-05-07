# Stakesense Demo — 2-Minute Video Script

**Target length:** 1:50 – 2:00. Submission max is 2:00.
**Recording tool:** Loom or OBS. 1080p, 30fps. Mic check before recording.
**Browser:** Chrome with Phantom extension installed (devnet selected).

**Tabs to pre-open** (in this order, left to right):
1. https://stakesense-el77-git-main-california-mortgage-solutions.vercel.app (landing — note the new search box under the hero)
2. /validators
3. /validators/{a-good-vote-pubkey} (pre-pick one with rich history; the OG card preview can be checked at /validators/{pk}/opengraph-image)
4. /simulate (optional — for the "find best swap" beat)
5. /portfolio?wallet=… (pre-pasted with a sample wallet so it loads instantly)
6. /operator/{your-vote-pubkey-or-any} (for the operator opt-in beat)
7. /stake
8. https://stakesense.onrender.com/docs (Swagger)
9. (optional) Claude Desktop with stakesense-mcp installed
10. https://github.com/mikejohnkurkeyerian-eng/stakesense

**Pre-recording checklist:**
- [ ] Phantom set to **devnet**, balance > 0 SOL (use built-in airdrop on /stake if needed)
- [ ] Browser zoom 110% (helps screen-record legibility)
- [ ] Hide bookmarks bar (View → Hide Bookmarks)
- [ ] Close all unrelated tabs/notifications
- [ ] Do Not Disturb on system
- [ ] Test mic levels — say a sentence, play it back
- [ ] One test run silent before final take

---

## Voiceover script (~290 words, ~115 wpm)

### Hook (0:00 – 0:10)

> "If you're staking SOL, the validator you choose affects your yield, the network's decentralization, and your slashing risk. The data you need is fragmented across five APIs and none of them predict the future. **Stakesense** does."

**Shot:** Landing page hero. Type a few characters in the new search box to show autocomplete, then scroll down to the top-3 recommendations card.

### Problem framing (0:10 – 0:22)

> "Today's tools show commission, skip rate, current stake — snapshots. They don't tell you which validators are trending toward delinquency, taxing more MEV than they share, or quietly clustering in one data center. That's a gap on a $50 billion stake market."

**Shot:** Quick zoom on the recommendations card. Cut to the validators table sorted by composite.

### Core demo — three pillars (0:22 – 0:48)

> "Stakesense scores every mainnet validator across three pillars. **Downtime risk** — a LightGBM model trained on rolling-window features. **MEV tax** — how much revenue the validator keeps versus passes to delegators. **Decentralization** — penalty for sharing data centers, ASNs, or countries. The composite is transparent; every weight is open."

**Shot:** Click a validator from the search box → land on the detail page. Show the score breakdown bars and the prediction-history chart. Quick pan to the methodology footer link.

### Two-sided market — operators too (0:48 – 1:00)

> "And it's two-sided. Validators get an operator dashboard with their rank, their gap to the top-10, and improvement levers — plus a one-click watch button so they get pinged on Discord or Slack when their score moves."

**Shot:** Switch to /operator/{pubkey}. Show the rank cards, scroll to "What would improve your score", click "Set up alert" to flash the watch form.

### Portfolio + simulator (1:00 – 1:25)

> "Paste any wallet — even a Squads multisig — and we'll score every delegation, surface concentration risk, and suggest rebalances. The simulator runs what-ifs: pick an objective, click 'Find best swap,' and the After column auto-fills with the optimal allocation. Composite, downtime, decentralization deltas all in one click."

**Shot:** /portfolio (pre-paste). Highlight the share-link button. Switch to /simulate, pick "Maximize composite", click "Find best swap" — let the deltas paint in.

### MCP + widget + open data (1:25 – 1:40)

> "Same data, everywhere you work. MCP server on npm — Claude or Cursor query stakesense natively. React widget — drop a score on any Solana site. Daily CSV exports under CC-BY. And a roadmap stub for Arcium-backed confidential queries so stakers can ask 'where should I stake?' without leaking inputs."

**Shot:** Claude Desktop tool call → /widget showcase tab → /data CSV download → quick flash of the `/api/v1/private/recommend` confidentiality envelope JSON.

### Stake flow (1:40 – 1:52)

> "When you've decided, one click delegates from /stake. Phantom for self-custody, Privy for email/social, Squads-compatible blob for DAOs. All three are wired."

**Shot:** /stake. Click Stake on a recommended validator → Phantom prompt → confirmation.

### Close (1:52 – 2:00)

> "MIT code. CC-BY data. Solo-built in two weeks. **Stakesense.** Link below."

**Shot:** README badge row + GitHub URL big and centered.

---

## B-roll / screenshots needed

Capture **before** recording so they're ready:

1. **Hero shot** — landing page with the new search box visible
2. **Top-3 recommendations card** — close crop
3. **Validators table** — sorted by composite score
4. **Validator detail page** — score-breakdown bars + history chart
5. **Per-validator OG card** — from /validators/{pk}/opengraph-image (for social-share preview)
6. **/operator dashboard** — rank cards + watch opt-in panel
7. **/simulate** — Before/After columns after "Find best swap" runs
8. **/portfolio** — concentration warnings + share-link button
9. **/methodology** — top of page
10. **/stake** — Phantom dropdown open
11. **/widget** — live preview tab
12. **MCP** — Claude Desktop tool-call screenshot (single frame)
13. **/api/v1/private/recommend** — JSON response showing the confidentiality envelope (Arcium teaser)
14. **Architecture diagram** — from README mermaid
15. **Test output** — `pytest` showing 105 passed
16. **GitHub repo** — top of page with star count + commit graph

## Fallback / re-record contingencies

- **If Phantom signing fails on camera** — pre-record stake confirmation separately, splice in
- **If RPC is slow** — wait, don't try to talk through dead air; cut and re-record
- **If MCP tool call fails** — have a fallback static screenshot ready
- **If Render cold-start delays a tab** — pre-warm by hitting /api/v1/health on each tab 60s before recording
- **If a deploy goes red mid-recording** — stop, fix, resume the next morning

## Editing notes

- Keep cuts tight; no slow zooms unless illustrating a number
- Add caption text for each new section (one or two words: "Portfolio", "Simulator", "MCP", "Stake")
- Background music — instrumental, low energy, fade under voiceover. CC0 sources only (Pixabay, FMA)
- Final 5 seconds — GitHub URL + "stakesense" wordmark, no music

## Post-record

- Upload as **unlisted** Loom or YouTube (don't risk auto-public)
- Run through once with the volume off — captions + visuals should make sense alone
- Get one human to watch end-to-end before final submission
- Add the URL to README, SUBMISSION.md, COLOSSEUM_FORM.md, and the Colosseum form itself

---

**Timing budget total:** 2:00 hard cap. If you go over by 5s on a take, cut from the closing sentence; do not cut the demo middle.
