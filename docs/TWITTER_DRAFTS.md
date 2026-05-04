# Twitter / X announcement drafts

Copy-paste ready drafts for the launch + sponsor mentions. Customize the personal voice; replace `[DEMO_URL]` with the unlisted YouTube/Loom link after recording.

## Launch thread (recommended for after submission)

> 1/ Building stakesense for Colosseum's Solana Frontier hackathon, solo, in 14 days. It's a public-goods ML oracle that scores every active mainnet validator on three pillars — downtime risk, MEV tax, decentralization. Live now. Open source.

> 2/ Why? $50B in SOL is staked. Existing tools show you commission, skip rate, current stake — none of them predict whether a validator's about to degrade or quietly cluster in the same data center as 30 others. Stakesense fills that gap.

> 3/ Three pillars, transparent weights:
> 0.5 × (1 − downtime_prob)
> + 0.3 × (1 − mev_tax)
> + 0.2 × decentralization
> Every weight, every feature, every model is published. CC-BY 4.0 on the data.

> 4/ Surfaces:
> 🌐 dashboard — sortable, search, /compare side-by-side
> 🤖 MCP server — Claude Desktop / Cursor query validator quality natively
> 📊 portfolio analyzer — paste any wallet, see exposure + rebalance suggestions
> 🧩 embeddable widget — drop a score on any site
> 📁 daily CSV/JSON exports

> 5/ Demo: [DEMO_URL]
> Repo: https://github.com/mikejohnkurkeyerian-eng/stakesense
> Open data: https://stakesense-el77-git-main-california-mortgage-solutions.vercel.app/data

> 6/ Public goods, MIT-licensed code, CC-BY 4.0 data. If you're a Solana wallet, dashboard, or DAO operator and stakesense would help your users — fork it, embed it, or just point at the API. No key needed.

> 7/ Built with @phantom for staking, @privy for embedded wallets, @solana for the data, @0xCypherpunk @Colosseum for the hackathon push. Everyone else who shipped in 12 days, you have my respect.

## Single-tweet variants

### Launch (general)

> Built stakesense for Solana Frontier — open-source ML oracle that scores every Solana validator on downtime risk, MEV tax, and decentralization. CC-BY 4.0 data, MCP server, portfolio analyzer, embeddable widget. Solo, 14 days. Repo + demo: https://github.com/mikejohnkurkeyerian-eng/stakesense

### MCP-flavored

> Stakesense ships as an MCP server. Claude Desktop / Cursor / any MCP-compatible agent can now query Solana validator quality natively. `claude mcp add stakesense -- npx stakesense-mcp`. Predictive scoring + decentralization data, free for any AI workflow.

### Portfolio analyzer

> Paste any Solana wallet into stakesense → see your stake exposure, concentration risk by data center / ASN / country, and ML-driven rebalance suggestions. Read-only, no signing. Validator quality is now a wallet-level concern. https://stakesense-el77-git-main-california-mortgage-solutions.vercel.app/portfolio

### Public goods angle

> Daily CSV/JSON snapshots of every Solana validator's predicted downtime risk, MEV tax, and decentralization score. CC-BY 4.0. Reusable in any wallet, dashboard, DAO, or research project. Validator quality data is the kind of infra that benefits Solana most when it's open and uniform.

### Sponsor mentions

> .@phantom × stakesense: one-click delegate from a recommended validator. Pick risk profile → top picks → click → sign. Live on devnet, mainnet next.

> .@privy × stakesense: stake without a wallet extension. Email login → embedded Solana wallet → delegate to a stakesense-recommended validator. Wallet-less staking is here.

> .@SolanaFndn × stakesense: every cron run we surface the latest Nakamoto coefficient + cluster concentration. Public goods for $50B in staked SOL.

> .@SquadsProtocol × stakesense: any Squads vault PDA works as a wallet input on /portfolio — DAO operators get instant treasury risk analysis. Full /stake/dao tx flow on the post-hackathon roadmap.

## Reply / quote-tweet templates

### When someone asks "how do I use this?"

> Three ways:
> 1) browser dashboard — https://stakesense-el77-git-main-california-mortgage-solutions.vercel.app
> 2) REST API — https://stakesense.onrender.com/docs (no key needed)
> 3) MCP server in Claude/Cursor — `claude mcp add stakesense -- npx stakesense-mcp`
> All open source. Pick the one that matches your workflow.

### When someone validator-shames you

> Composite weights are heuristic, not learned — that's documented in MODEL_CARD.md. The page accepts custom weights via query string: `?w_downtime=0.7&w_mev=0.2&w_dec=0.1`. Different delegator preferences will rank validators differently. That's a feature.

### When someone asks "are predictions good?"

> Walk-forward AUC on the trained downtime model is in the model card; we fall back to a deterministic predictor when history is too thin. The trained model improves as the cron accumulates more epochs. Not investment advice — please form your own staking strategy.

## Posting checklist

- [ ] Replace `[DEMO_URL]` with the actual YouTube/Loom link
- [ ] Verify all live URLs work
- [ ] Tag relevant accounts only if confident the integration is reviewable (don't tag a sponsor for a feature that's broken)
- [ ] Schedule first tweet for a high-engagement window (Tue–Thu, 11am or 7pm ET)
- [ ] Include the OG image preview (auto-rendered when you post the dashboard URL)
- [ ] Cross-post to LinkedIn if it fits your audience
