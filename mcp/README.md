# stakesense-mcp

> Model Context Protocol server exposing predictive Solana validator quality scoring to Claude Desktop, Claude Code, Cursor, and any MCP-compatible LLM agent.

[![npm version](https://img.shields.io/npm/v/stakesense-mcp.svg)](https://www.npmjs.com/package/stakesense-mcp)
[![license](https://img.shields.io/badge/license-MIT-blue)](../LICENSE)

## What it gives an agent

Eight tools and five resources, all backed by the public stakesense REST API:

### Tools

| Tool | What it answers |
|---|---|
| `get_validator_score` | Latest pillar + composite scores for a vote pubkey, with metadata + recent history |
| `recommend_top_validators` | "Where should I stake N SOL?" — ranked list with reasoning |
| `list_validators` | Browse top of any pillar (composite / downtime / mev_tax / decentralization) |
| `get_validator_history` | "Is this validator getting better or worse?" — score trajectory |
| `get_decentralization_report` | Network-wide Nakamoto coefficient + ASN/data-center/country breakdowns |
| `get_concentration_by` | Top clusters along one axis (data_center / asn / country) |
| `get_network_stats` | Global summary (averages, latest epoch, validator count) |
| `health_check` | API liveness + last refresh timestamp |

### Resources (read-once context)

| URI | Contents |
|---|---|
| `stakesense://methodology` | Long-form methodology paper (markdown) |
| `stakesense://model-card` | Technical model documentation (markdown) |
| `stakesense://manifest` | Open-data export manifest (JSON, CC-BY 4.0) |
| `stakesense://network-stats` | Latest network averages + Nakamoto coefficient |
| `stakesense://decentralization` | Concentration breakdown snapshot |

## Install

### Claude Desktop / Claude Code

```bash
claude mcp add stakesense -- npx stakesense-mcp
```

That's it — restart Claude and ask: "Which Solana validators have the lowest predicted downtime risk?"

### Cursor / Windsurf

Add to your MCP config (Cursor: Settings → Features → MCP, or `~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "stakesense": {
      "command": "npx",
      "args": ["-y", "stakesense-mcp"]
    }
  }
}
```

### Manual / from source

```bash
git clone https://github.com/mikejohnkurkeyerian-eng/stakesense
cd stakesense/mcp
pnpm install
pnpm build
node dist/index.js   # speaks MCP over stdio
```

## Configuration

| Env var | Default | Purpose |
|---|---|---|
| `STAKESENSE_API_BASE` | `https://stakesense.onrender.com` | Override to point at a self-hosted stakesense backend |

## Example prompts

Once installed, your agent has predictive Solana validator data on tap:

- "List the top 5 validators by composite score and explain why each one ranks high."
- "I have 100 SOL to stake — pick three validators for a balanced risk profile and tell me why."
- "What's Solana's current Nakamoto coefficient, and which data centers host the most validators?"
- "Show me the prediction history for `<vote_pubkey>` over the last 30 days. Is it trending up or down?"
- "Compare the decentralization-score distribution across the top 50 validators."

## Data freshness

Stakesense refreshes twice daily (04:17 + 16:17 UTC) via a GitHub Actions cron. The `health_check` tool reports `last_update_epoch` and `last_prediction_date` so your agent can confirm freshness before answering time-sensitive questions.

## License

MIT. The data the server exposes is published under [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/) — please attribute `stakesense` if you reuse it.

## Bug? Idea?

[Open an issue](https://github.com/mikejohnkurkeyerian-eng/stakesense/issues) on the main repo. PRs welcome.
