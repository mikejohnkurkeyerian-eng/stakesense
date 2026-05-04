# Contributing to stakesense

Thanks for considering it. Stakesense is a public good — every PR makes Solana staking more transparent for everyone. This guide aims to make the contribution path obvious.

## Quick start

```bash
git clone https://github.com/mikejohnkurkeyerian-eng/stakesense
cd stakesense

# API
cd api
python -m venv .venv && source .venv/Scripts/activate  # or .venv/bin/activate on macOS/Linux
pip install -e ".[dev]"
cp ../.env.example ../.env
# Fill in the keys (instructions in MODEL_CARD.md and docs/METHODOLOGY.md §6)
python scripts/migrate.py
python scripts/refresh_all.py
python scripts/predict_today.py
uvicorn stakesense.api.main:app --reload --port 8000

# Web (in another terminal)
cd ../web
pnpm install
echo "NEXT_PUBLIC_API_BASE=http://localhost:8000" > .env.local
pnpm dev

# MCP (in another terminal, optional)
cd ../mcp
pnpm install
pnpm dev
```

Total time on a fresh machine: ~15 minutes.

## Project structure

```
api/    Python FastAPI service + ML pipeline
web/    Next.js 16 dashboard
mcp/    Model Context Protocol server
docs/   Specs, plans, methodology, submission packet
```

See `README.md` for a more detailed layout.

## How to contribute

### Reporting bugs

[Open an issue](https://github.com/mikejohnkurkeyerian-eng/stakesense/issues/new). Include:
- What you expected
- What actually happened
- Steps to reproduce (URL or code)
- Browser / OS / Python version if relevant

For backend issues, the most useful debug data is the validator's vote pubkey or the API URL that failed.

### Pull requests

1. Open an issue first if it's a bigger change — saves duplicate work
2. Fork → branch → PR
3. Add tests for new behavior. Run `pytest` (api/) and `pnpm test` (mcp/) before pushing
4. Commit messages: short imperative subject (≤50 chars), optional body explaining *why*
5. PR description: what changed, why, how to verify

### Code style

- **Python:** type hints encouraged; we follow `ruff` defaults (run `ruff check api/`)
- **TypeScript:** `tsc --noEmit` should pass; we don't enforce a formatter — match surrounding style
- **No new external services** without discussion (we keep ops minimal)

### Tests

- API: pytest tests run against the live database using a sentinel pubkey (`TEST_FIXTURE_Vote111_DO_NOT_USE_AS_REAL`) — they're safe to run against production data
- MCP: vitest with a mocked client — no live API calls needed
- Web: no automated tests yet (PRs welcome)

### Documentation

- README and docs/ are the canonical surfaces for users
- Code comments should explain *why*, not *what*
- If you add a new public API endpoint, add it to the `manifest.json` export listing too

## Areas that especially need contributors

- **Mainnet stake flow** — currently `/stake` is devnet only
- **Slashing risk model** when Solana introduces slashing
- **Validator alerts** — Discord/Twitter/email when a delegated validator's risk score crosses a threshold
- **Multi-cluster support** — testnet/devnet variants
- **Translations** — labels are currently English-only
- **Performance** — Lighthouse audit + image optimization
- **Mobile UI polish** — the dashboard is mobile-OK but not mobile-great

## License

By contributing, you agree your contributions are licensed under MIT (code) and CC-BY 4.0 (data) to match the rest of the repository.

## Questions?

[Open an issue](https://github.com/mikejohnkurkeyerian-eng/stakesense/issues) or email mikejohnkurkeyerian@gmail.com.
