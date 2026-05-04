# Stakesense Demo — 2-Minute Video Script

**Target length:** 1:50 – 2:00. Submission max is 2:00.
**Recording tool:** Loom or OBS. 1080p, 30fps. Mic check before recording.
**Browser:** Chrome with Phantom extension installed (devnet selected).
**Tabs to pre-open** (in this order, left to right):
1. https://stakesense-el77-git-main-california-mortgage-solutions.vercel.app (landing)
2. /validators
3. /validators/{a-good-vote-pubkey} (pre-pick one with rich history)
4. /compare?a=…&b=… (two pre-picked validators)
5. /portfolio (pre-paste a wallet)
6. /stake
7. /backtest
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

## Voiceover script (~280 words, ~115 wpm)

### Hook (0:00 – 0:10)

> "If you're staking SOL, the validator you choose affects your yield, the network's decentralization, and your slashing risk. But the data you need to choose well is fragmented across five APIs and zero of them predict the future. **Stakesense** does."

**Shot:** Landing page hero. Cursor hovers over the "Public Goods" badge, then scrolls down to the top-3 recommendations card.

### Problem framing (0:10 – 0:25)

> "Today's tools show you commission, skip rate, and current stake. They don't tell you which validators are trending toward delinquency, taxing more MEV than they share, or quietly clustering in the same data center. That's a gap, on a $50 billion stake market."

**Shot:** Quick zoom on the recommendations card numbers. Cut to a snapshot of the validators table.

### Core demo — dashboard (0:25 – 0:55)

> "Stakesense scores every active mainnet validator across three pillars. **Downtime risk** comes from a LightGBM model trained on rolling-window skip-rate, vote-latency, and stake-change features. **MEV tax** measures how much MEV revenue the validator keeps versus what it passes to delegators. **Decentralization** penalizes data-center, ASN, and country concentration. The composite is transparent — every weight is published."

**Shot:** Click into `/validators`. Sort by composite score. Click into one validator's detail page. Show the recharts history. Pan to the methodology link in the footer.

### Differentiator — portfolio analyzer (0:55 – 1:15)

> "Paste any wallet, and we'll analyze your real stake exposure. Concentration risk by data center, weighted downtime risk, and rebalance recommendations — all from one address."

**Shot:** /portfolio. Paste pre-prepared wallet. Scroll through the warnings + suggested moves.

### MCP server (1:15 – 1:30)

> "We also ship as an MCP server. Claude Desktop, Cursor, Claude Code — any LLM agent can query stakesense natively. *(Show Claude asking 'which Solana validators have the lowest downtime risk this week')*. The data the AI sees is the same data on the dashboard, refreshed twice a day."

**Shot:** Claude Desktop sending a prompt → tool call → response with structured JSON → Claude rephrasing the answer.

### Stake flow (1:30 – 1:45)

> "When you've decided, one click delegates from /stake. Phantom for self-custody, or Privy for email/social wallets. DAOs use the Squads multisig flow. All three are wired."

**Shot:** /stake. Click "Connect Phantom." Pick a recommended validator. Click Stake. Show the confirmation in Solana Explorer.

### Open-source close (1:45 – 2:00)

> "Everything is MIT-licensed. The model card, training data, and feature pipeline are public. Daily CSV exports under CC-BY. We built this for the network — and we built it solo, in two weeks. **Stakesense.** Github link in the description."

**Shot:** README with the badge row + the architecture diagram. End on the GitHub URL big and centered.

---

## B-roll / screenshots needed

For thumbnails, README, and submission embeds — capture **before** recording so they're ready:

1. **Hero shot** — landing page top half, with "Public Goods" badge clearly visible
2. **Top-3 recommendations card** — close crop
3. **Validators table** — sorted by composite score, top of fold
4. **Validator detail page** — recharts visible (skip rate over time)
5. **/compare** page — two validators side by side
6. **/portfolio** — populated with a real wallet, showing concentration warnings
7. **/methodology** — top of page
8. **/stake** — Phantom dropdown open
9. **/backtest** — strategy comparison chart
10. **MCP** — Claude Desktop tool call screenshot (single frame)
11. **Architecture diagram** — from README mermaid (rendered or hand-drawn)
12. **Render / Vercel green status badges** — proof of liveness
13. **Test output** — `pytest` showing 18/18 passing
14. **GitHub repo** — top of page with star count + commit graph

## Fallback / re-record contingencies

- **If Phantom signing fails on camera** — pre-record stake confirmation separately, splice in
- **If RPC is slow** — wait, don't try to talk through dead air; cut and re-record
- **If MCP tool call fails** — have a fallback static screenshot ready
- **If a deploy goes red mid-recording** — stop, fix, resume the next morning

## Editing notes

- Keep cuts tight; no slow zooms unless illustrating a number
- Add caption text for each new section (one or two words: "Portfolio Analyzer", "MCP Server", "Stake Flow")
- Background music — instrumental, low energy, fade under voiceover. CC0 sources only (Pixabay, FMA)
- Final 5 seconds — Github URL + "stakesense" wordmark, no music

## Post-record

- Upload as **unlisted** Loom or YouTube (don't risk auto-public)
- Run through once with the volume off — captions + visuals should make sense alone
- Get one human to watch end-to-end before final submission
- Add the URL to README, SUBMISSION.md, and the Colosseum form

---

**Timing budget total:** 2:00 hard cap. If you go over by 5s on a take, cut from the closing sentence; do not cut the demo middle.
