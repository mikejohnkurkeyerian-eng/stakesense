# Solana Foundation — Stakesense Public Goods Submission

**Project:** Stakesense — Predictive Validator Quality Oracle
**Live:** https://stakesense-el77-git-main-california-mortgage-solutions.vercel.app
**Repo:** https://github.com/mikejohnkurkeyerian-eng/stakesense
**MCP server:** [`stakesense-mcp` on npm](https://www.npmjs.com/package/stakesense-mcp)
**Open data:** https://stakesense-el77-git-main-california-mortgage-solutions.vercel.app/data (CC-BY 4.0)
**Hackathon:** Solana Frontier (Colosseum), 2026 — **Public Goods track**
**Builder:** Mike (mikejohnkurkeyerian-eng)
**Contact:** mikejohnkurkeyerian@gmail.com

---

## Why this is a public good for Solana

Stakesense addresses a structural information asymmetry in Solana staking:

- **The asset:** ~$50B in SOL is staked across ~800 active validators
- **The decision:** every delegator is constantly choosing where their stake should sit, and that choice affects yield, network decentralization, and slashing risk
- **The gap:** existing tools (validators.app, stakewiz, marinade dashboards) surface *current* state but no predictive signal about whether a validator is degrading, capturing more MEV than it shares, or quietly clustering in one data center

Stakesense fills that gap with an **open ML oracle** anyone can use, fork, audit, or integrate.

## What we publish openly

1. **Code:** MIT-licensed end-to-end. Validator data ingestion, feature engineering, training, scoring, REST API, dashboard, MCP server — all public.
2. **Data:** Daily CSV/JSON snapshots under **CC-BY 4.0**:
   - `predictions.csv` — every validator's pillar + composite scores
   - `validators.csv` — catalog with metadata
   - `decentralization.json` — Nakamoto coefficient + cluster breakdowns
3. **Methodology:** Long-form paper (`docs/METHODOLOGY.md`) explaining every feature, every weight, every limitation — written so an auditor can reproduce the entire pipeline from scratch in <15 minutes
4. **Model card:** Standard transparency artifact (`MODEL_CARD.md`) following Mitchell et al. conventions
5. **MCP server:** `stakesense-mcp` on npm — Claude / Cursor / any MCP-compatible LLM agent can query validator quality natively. AI agents are a growing class of consumer; building MCP support means AI tools that touch Solana have first-class access to predictive scoring.
6. **Embeddable widget:** `<script>` + `<div data-stakesense-validator>` lets *any* Solana site drop in scores. Distribution-as-a-public-good.

## Decentralization-first design

The decentralization pillar isn't a bolt-on — it's a first-class score:

- **Nakamoto coefficient surfaced** on the landing page, the `/stats` page, and exposed via API + MCP
- **Cluster concentration** by data center, ASN, and country — published every refresh
- **Superminority penalty** in scoring: validators in the top-N stake bracket where their cumulative stake passes 33% are penalized, encouraging delegators toward smaller operators
- **Rebalance recommendations** on `/portfolio` actively push delegators toward decentralization-positive moves

A delegator using stakesense who follows the recommendations is *systematically* steered toward the long tail of validators rather than the top of the stake distribution.

## Quantified contributions

| Surface | Rows / scope |
|---|---|
| Validators scored | 789 active mainnet (+ delinquent capture) |
| Validators with full geographic metadata | 752 |
| Historical epoch-performance rows | 5,500+ |
| Jito MEV commission observations | 2,186 |
| Composite predictions written | 3,914 |
| Cron refresh cadence | 2x/day, 100% green for 7+ days |
| Tests passing (api + mcp) | 32 + 13 = 45 |
| Concrete public-goods deliverables | 6 (code, data, methodology, model card, MCP, widget) |

## Sustainability post-hackathon

The infrastructure runs on free tiers (Render, Vercel, Supabase free, Helius free). Total ongoing cost: $0 / month. The builder commits to keeping the public dataset and MCP server alive at that cost level for at least 6 months post-hackathon, with a Patreon / sponsor program to be opened if compute costs exceed free-tier limits.

The repo welcomes PRs. Issues are tagged `good-first-issue` where appropriate.

## What we'd do with Public Goods funding

1. **Mainnet stake flow** — currently `/stake` is devnet only; mainnet staking integration is the largest single piece of remaining work
2. **SDK** — Python and Rust SDKs for protocol integrations (DAO treasury managers, exchange staking products)
3. **Slashing risk model** — when Solana introduces slashing, stakesense extends to capture it
4. **Validator alerts** — Discord/Twitter/email notifications for stakers when their delegation's risk score crosses a threshold
5. **Multi-cluster** — testnet/devnet variants for validator operators to monitor before mainnet promotions
6. **Operator dashboard** — flip the lens: tools for *validators* to see how stakesense scores them and what would improve their rank

Each of these compounds the public-goods value rather than gatekeeping it.

## License

MIT for code. CC-BY 4.0 for data. Both chosen specifically so commercial integrators (wallets, exchanges, custodians) can use stakesense without legal friction — broadening adoption of *Solana decentralization metrics* by lowering the cost of using them.

## One-liner for the listing page

> Stakesense — open-source ML scoring of every Solana validator on downtime risk, MEV tax, and decentralization. CC-BY 4.0 data, MCP server, embeddable widget. Public goods for a $50B staking market.
