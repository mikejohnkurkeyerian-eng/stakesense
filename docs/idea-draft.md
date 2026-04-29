# Idea Draft — Solana Address Intelligence Agent + MCP Server

**Status:** Draft, pending novelty validation and architecture approval
**Hackathon:** Colosseum (12-day window starting 2026-04-28)
**Builder:** Solo (AI/ML + full-stack, learning Solana)

## One-liner

A Solana-native AI agent that takes any address (token mint, wallet, NFT mint, program, validator) and returns structured, AI-synthesized intelligence — surfaced both as a web app for end users and as an MCP server for other AI agents.

## The unifying primitive

Token DD, wallet forensics, validator analysis, and NFT pricing all reduce to the same operation: *"Give me an address, get structured intelligence back."* By treating every address type uniformly, one product covers what fragmented tools cover today.

## V1 scope

- **Two address types shipped:** tokens and wallets
- **Read-only intelligence only.** No trading, execution, alerts, or portfolio tracking
- **Auto-detect address type** from on-chain data
- **For token mints:** holder distribution, LP health, dev wallet activity, rug-risk score, supply concentration
- **For wallets:** realized/unrealized PnL, behavior labels (sniper / insider / whale / farmer), connected-wallet graph, risk score

## Two surfaces, one codebase

1. **Web UI** — paste an address, get a report
2. **MCP server** — exposes each primitive as a tool (`get_holder_distribution`, `score_rug_risk`, `label_wallet_behavior`, etc.) for Claude Desktop, ChatGPT, and other agents to call

The MCP layer is essentially "free" once the primitive functions exist. That is the architectural trick that makes the hybrid feasible solo in 12 days.

## Proposed stack (pending lock-in)

- Next.js 14 + TypeScript (one repo, full-stack)
- Anthropic SDK (Claude) with prompt caching for the agent reasoning layer
- `@modelcontextprotocol/sdk` for the MCP surface
- Helius RPC + Birdeye API + Jupiter Price API for data
- Vercel KV for caching expensive lookups
- shadcn/ui for fast clean UI
- Vercel deploy

## Architecture (4 layers)

```
[ Web UI ]   [ MCP Server ]
       \         /
   [ Agent Reasoning Layer (Claude) ]
              |
   [ Primitive Tools (typed functions) ]
              |
   [ Data Sources: Helius, Birdeye, Jupiter, Solana RPC ]
```

The primitive tools layer is the heart of the product. Both surfaces consume it.

## Why this can win as a solo project

- **Scope discipline:** one coherent product, two demos
- **Multiple bounty surfaces:** token sponsors (Helius, Birdeye), agent infra (Solana Foundation, MCP-related), wallet analytics
- **Demoable:** paste a known scammer wallet → live intelligence on stage
- **Defensible moat (if validation passes):** the MCP exposure for the AI-agent ecosystem is genuinely new

## Open questions (must resolve before building)

1. **Novelty:** is this materially different from Rugcheck / GMGN / Bubblemaps / existing Solana MCP servers? *(Landscape scan in progress.)*
2. **Architecture lock-in:** stack and 4-layer design pending user approval
3. **Niche sharpening:** if landscape scan shows overlap, where is the unclaimed white space?
4. **Bounty targeting:** which 3 sponsor bounties to optimize for?

## Decision gates before implementation begins

- [ ] Landscape scan completes; novelty confirmed or pivot decided
- [ ] Architecture and stack approved
- [ ] Sponsor bounty targets selected (max 3)
- [ ] Spec doc written and reviewed
- [ ] Implementation plan written
