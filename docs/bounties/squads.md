# Squads — Stakesense Bounty Submission (DAO Treasury Staking)

**Project:** Stakesense — Predictive Validator Quality Oracle
**Live:** https://stakesense-el77-git-main-california-mortgage-solutions.vercel.app
**Repo:** https://github.com/mikejohnkurkeyerian-eng/stakesense
**Hackathon:** Solana Frontier (Colosseum), 2026
**Builder:** Mike (mikejohnkurkeyerian-eng)
**Contact:** mikejohnkurkeyerian@gmail.com

---

## What we built

Stakesense scores every active Solana validator on three pillars (downtime risk, MEV tax, decentralization) with an ML oracle. The Squads-specific surface answers a question DAOs face every quarter: **"where should our treasury's staked SOL sit?"** — without imposing the operational overhead of building an in-house validator scoring committee.

**The Squads-specific surfaces:**

1. **`/portfolio?wallet=<multisig_pda>` works for any wallet** — including a Squads vault PDA. A Squads operator can paste the multisig vault address and immediately see:
   - Total staked SOL, weighted composite score
   - Concentration risk (data center, ASN, country) — important for treasury policies that explicitly require geographic diversity
   - Per-position scoring with rebalance suggestions
2. **MCP server** ([`stakesense-mcp`](https://www.npmjs.com/package/stakesense-mcp)) — Squads operators using Claude / Cursor can ask "is our treasury overexposed to any one data center?" and the agent answers from live data
3. **Open data exports** — DAOs that want to build internal staking dashboards can pull `predictions.csv` directly under CC-BY 4.0
4. **Embeddable widget** — drops a stakesense score into Squads UI add-ons or DAO governance forums

**Shipped: `/stake/multisig` — generic multisig stake-tx generator.** A read-only page that:

1. Takes a multisig vault pubkey + amount + network (devnet / mainnet-beta)
2. Pulls stakesense-recommended validators
3. Constructs a stake-account creation + delegation transaction with the vault as the staker authority
4. Partial-signs with the new stake-account keypair so the multisig only needs to add its own approvals
5. Outputs the transaction in base58 + base64 — paste into Squads, Realms, or any multisig UI that accepts raw transactions

This works **today** with Squads V4 multisigs. Full Squads-native UI integration (proposal SDK, deep-link to approval screen) is the natural next sprint with bounty support.

## Why DAOs need this

Treasury staking decisions are usually made by 1–3 people in a council vote. Without quantitative scoring, those decisions default to vibes ("ChainflowSwitchboard sounds reputable") or marketing. Stakesense gives every DAO the same ML-driven scoring data that institutional stakers would build in-house — published as a public good.

For Squads specifically:
- The portfolio analyzer treats a Squads vault PDA the same as a personal wallet
- The Nakamoto coefficient surfaced on `/stats` is exactly the metric a decentralization-conscious DAO would want to see when evaluating their staking policy
- The export endpoints are tabular CSVs designed for spreadsheet-driven treasury workflows

## Code references

- **Multisig stake-tx generator:** `web/app/stake/multisig/page.tsx`
- Portfolio analyzer (works with any pubkey including multisig vaults): `web/app/portfolio/page.tsx`, `api/src/stakesense/api/routers/portfolio.py`, `api/src/stakesense/scoring/portfolio.py`
- Stake account discovery via RPC: `api/src/stakesense/sources/stake_accounts.py`
- MCP server: `mcp/src/`
- Open-data exports: `api/src/stakesense/api/routers/export.py`

## What we'd build with the bounty

1. **Native Squads V4 SDK integration** — replace the paste-the-blob flow with direct proposal creation via the Squads SDK; deep-link into the approval screen
2. **DAO council dashboard** — invite the multisig council, share a link, every member sees the same risk dashboard before voting
3. **Policy templates** — "max 50% in one data center", "no superminority validators", "weighted composite > 0.7" — codified as policy rules that fail validation if a proposal violates them
4. **Audit log** — every delegate / undelegate proposal cross-referenced against the validator's stakesense score *at the time of decision*, so DAOs can audit treasury performance retroactively

## Demo for judges

**Portfolio analysis:**
1. Open `/portfolio`, paste a Squads vault PDA
2. See risk-scored treasury, concentration warnings, rebalance suggestions

**Stake creation:**
1. Open `/stake/multisig`, paste vault, pick a stakesense-recommended validator, set amount
2. Copy the generated base58 blob → open Squads → import as raw transaction → submit to council

## License

- Code: MIT
- Data: CC-BY 4.0
- All stakesense code is open. Any DAO operator can fork, deploy a private backend, and run the analyzer on their own infra.

## One-liner for the listing page

> Stakesense — ML-driven validator scoring + portfolio risk analyzer for any Solana wallet, including Squads multisig treasuries. Open-source public goods.
