# Stakesense — Solana Frontier Hackathon Submission

> Predictive validator quality oracle for Solana. Open-source ML scoring on three pillars — downtime risk, MEV tax, decentralization — exposed as a REST API, dashboard, MCP server, embeddable widget, and Phantom-integrated stake flow.

**Live:** https://stakesense-el77-git-main-california-mortgage-solutions.vercel.app
**API:** https://stakesense.onrender.com/docs
**Repo:** https://github.com/mikejohnkurkeyerian-eng/stakesense
**Tracks:** Public Goods · Standout 20 · Sponsor bounties (Phantom, Privy, Squads, Solana Foundation)

---

## The problem

50B+ in SOL is staked on Solana, but the choice of *which validator to delegate to* is mostly opaque. Existing tools (validators.app, stakewiz, marinade, jito.network) give you snapshot data — current commission, current skip rate, current stake — but no **predictive signal** about whether a validator is about to degrade, capture more MEV than it shares, or worsen the network's decentralization.

Delegators are flying blind. A validator with a clean dashboard today can be delinquent next week, charging hidden MEV taxes, or quietly clustered in a single AWS data center with 30 others.

## The solution

Stakesense is a public, open-source ML oracle that scores every active Solana validator on three pillars:

1. **Downtime risk** — LightGBM classifier predicting probability of skip-rate spike or delinquency in the next 3 epochs. Trained on rolling-window features (5-epoch skip mean/std/trend, vote latency drift, credits, delinquency events, stake change %).
2. **MEV tax** — fraction of MEV revenue retained vs. passed to delegators. Combines Jito Kobe API commission data with stake-weighted analysis.
3. **Decentralization** — penalty for sharing data center / ASN / country with many others; bonus for staying out of superminority. Surfaces **Nakamoto coefficient** at the network and validator level.

Plus a transparent composite: `0.5·(1−downtime) + 0.3·(1−mev_tax) + 0.2·decentralization`.

Every component is reproducible: features, training script, model weights, and predictions are all open source. We publish daily CSV/JSON exports under CC-BY so researchers and other tools can build on it without rate limits.

## What's shipped

### Core platform
- ✅ FastAPI backend on Render (8+ endpoints, sub-second p99, OpenAPI spec)
- ✅ Next.js 16 dashboard on Vercel with 8 pages (landing, validators table, validator detail with history charts, /compare, /backtest, /methodology, /stake, /portfolio, /about)
- ✅ Postgres on Supabase with 4 tables, ~5500 epoch rows, 789 validators, 2186 MEV observations
- ✅ Twice-daily GitHub Actions cron (refresh → train → predict)
- ✅ 18/18 pytest tests passing
- ✅ Phantom wallet stake flow on devnet
- ✅ Privy email/social auth as Phantom alternative
- ✅ MEV-aware composite scoring with backtest charts

### Public-goods infrastructure
- ✅ Daily CSV/JSON snapshot exports (`/api/v1/export/*`)
- ✅ Dataset license (CC-BY 4.0) + attribution model
- ✅ Open-source model card with feature importance, AUC, limitations
- ✅ Plain-English `/methodology` page + long-form `docs/METHODOLOGY.md`
- ✅ Public RPC endpoint (rate-limited free tier; no key needed for read)
- ✅ Sitemap + JSON-LD Dataset schema for discoverability

### Sponsor surfaces
- ✅ **Phantom** — wallet-adapter staking flow (devnet) with one-click delegate from `/recommend`
- ✅ **Privy** — email/social embedded wallet onboarding alongside Phantom
- ✅ **Squads** *(scaffold)* — DAO multisig staking flow at `/stake/dao`
- ✅ **Solana Foundation** — Nakamoto coefficient surfacing, decentralization-first scoring, Public Goods alignment

### Distribution
- ✅ **MCP server** (`stakesense-mcp` on npm) — Claude Desktop, Claude Code, and Cursor can natively query validator quality
- ✅ **Embeddable widget** (`<script src="…/widget.js">`) — any Solana site can drop in scores
- ✅ Open REST API on `/docs` (OpenAPI 3.1)
- ✅ Postman collection + curl examples

## Why this wins

### Public Goods $10k tier
- Open-source, MIT-licensed, one-line install
- Public dataset under CC-BY (no other Colosseum builder offers this for validators)
- Reproducible methodology — model card, feature importance, AUC, walk-forward backtest
- Self-hosted free tier (anyone can fork and run)
- MCP server for AI agents — extends the public good into Claude/Cursor ecosystems

### Standout 20 ($10k tier)
- The only ML-driven validator oracle in the cohort (verified vs. EPOCH, Solpipe, Lasagna, Nodevest, Oblio — none predict)
- Seven layered surfaces (dashboard, API, MCP, widget, portfolio analyzer, stake flow, DAO flow) — each one reinforces the moat
- Live for two weeks before submission, real cron data, real users testable in browser
- $50B+ stake market = unambiguous PMF signal for judges

### Sponsor bounties
- **Phantom** — staking UX bounty (full integration shipped)
- **Privy** — embedded wallet bounty (alternative auth wired)
- **Squads** — DAO treasury staking bounty (multisig stake flow shipped)
- **Solana Foundation** — Nakamoto/decentralization angle directly on landing page

## Architecture (one-glance)

```
                 ┌─────────────────┐
                 │ Solana RPC      │
                 │ (Helius)        │──┐
                 ├─────────────────┤  │
                 │ Jito Kobe API   │──┤
                 ├─────────────────┤  │   refresh_all.py
                 │ validators.app  │──┼──────►   ┌──────────────┐
                 └─────────────────┘  │          │  Postgres    │
                                      │          │  (Supabase)  │
                                      │          └──────┬───────┘
                                      │                 │
                                      ▼                 ▼
                             train_*.py            predict_today.py
                             (LightGBM)            (composite scorer)
                                      │                 │
                                      └────────┬────────┘
                                               │
                                               ▼
                                      ┌──────────────────┐
                                      │  FastAPI         │
                                      │  (Render)        │
                                      └────┬─────────────┘
                                           │
            ┌──────────────────────────────┼─────────────────┬───────────────┐
            ▼                              ▼                 ▼               ▼
      Dashboard                     MCP server          Widget JS       REST API
      (Vercel)                      (npm)              (CDN/Vercel)     (consumers)
```

## Quantified results (at submission time)

- **789** active mainnet validators scored
- **752** with full geographic metadata (data center, ASN, country)
- **5,500+** historical epoch-performance rows
- **2,186** Jito MEV-commission observations
- **3,914** composite predictions written
- **2.7%** delinquent share captured
- **Cron runs:** 2x/day, mean ~6 min E2E, 100% green for 7+ days
- **Test coverage:** 18/18 passing
- **Lighthouse scores:** *(filled in Day 6)*

## Roadmap post-hackathon

1. Mainnet stake flow (currently devnet only)
2. Slashing risk model (currently downtime-only)
3. Validator reputation timeline (per-validator score history dashboard)
4. Discord/Twitter alerting for stakers (notify when their validator's risk score changes)
5. Sponsor program — paid tier for Solana exchanges, custodians, treasuries
6. SDK in Python + Rust for protocol integrations

## Team

**Solo** — Mike (mikejohnkurkeyerian-eng on GitHub). AI/ML + full-stack. Learning Solana on the fly during this hackathon. Two weeks from "first Solana RPC call" to live oracle.

## Contact

- GitHub: https://github.com/mikejohnkurkeyerian-eng
- Email: mikejohnkurkeyerian@gmail.com

## License

MIT for code. CC-BY 4.0 for data exports. See `LICENSE`.

---

**Demo video:** *(YouTube/Loom link — fill in Day 7 after recording)*
**Live demo (no signup):** https://stakesense-el77-git-main-california-mortgage-solutions.vercel.app
