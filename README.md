# stakesense

> Predictive validator quality oracle for Solana. Open-source ML scoring on three pillars — downtime risk, MEV tax, decentralization — exposed as a REST API, a dashboard, and a Phantom-integrated stake flow.

[![status](https://img.shields.io/badge/status-live-22c55e)](https://stakesense.onrender.com/api/v1/health) [![license](https://img.shields.io/badge/license-MIT-blue)](LICENSE) [![hackathon](https://img.shields.io/badge/Solana%20Frontier-2026-9333ea)](https://colosseum.com/frontier)

## Live

| | URL |
|---|---|
| 🏠 Dashboard | https://stakesense-el77-git-main-california-mortgage-solutions.vercel.app |
| 📊 Validators | [/validators](https://stakesense-el77-git-main-california-mortgage-solutions.vercel.app/validators) |
| 💰 Stake (devnet) | [/stake](https://stakesense-el77-git-main-california-mortgage-solutions.vercel.app/stake) |
| 📈 Backtest | [/backtest](https://stakesense-el77-git-main-california-mortgage-solutions.vercel.app/backtest) |
| 📝 Methodology | [/methodology](https://stakesense-el77-git-main-california-mortgage-solutions.vercel.app/methodology) |
| 🔗 REST API | https://stakesense.onrender.com/docs |
| 📄 Model Card | [MODEL_CARD.md](MODEL_CARD.md) |

## What it does

For every active Solana validator, stakesense computes:

1. **Downtime risk** — LightGBM classifier predicting probability of skip-rate spike or delinquency in the next 3 epochs.
2. **MEV tax** — fraction of MEV revenue the validator keeps for themselves vs. passes to delegators.
3. **Decentralization** — penalty for sharing data center / ASN / country with many others; bonus for staying out of superminority.

Plus a transparent composite: `0.5·(1−downtime) + 0.3·(1−mev_tax) + 0.2·decentralization`.

## How

A twice-daily GitHub Actions cron (`refresh_all.py` → `train_*.py` → `predict_today.py`) pulls fresh data from:

- Solana RPC (Helius) — `getVoteAccounts`, `getBlockProduction`
- Jito Kobe API — MEV commission per validator
- validators.app — geographic / hosting metadata (when token configured)

…persists into Postgres (Supabase), retrains the LightGBM models, and writes new predictions. The dashboard reads from FastAPI which reads from Postgres.

## Repo layout

```
api/
  src/stakesense/
    api/         # FastAPI service (5 endpoints)
    db/          # SQLAlchemy models + repos
    sources/     # Solana RPC, Jito, Stakewiz, validators.app clients
    features/    # rolling-window + static feature engineering
    training/    # LightGBM downtime classifier + MEV regressor
    scoring/     # rule-based decentralization + composite + backtest
  scripts/       # refresh_all, train_*, predict_today, data_quality, backtest
  tests/         # pytest fixtures + unit tests
web/
  app/           # Next.js 16 App Router pages
    /              # landing
    /validators    # sortable + searchable table
    /validators/[vote_pubkey]  # detail with recharts
    /stake         # Phantom-integrated stake flow
    /backtest      # strategy comparison
    /methodology   # explainer
  components/    # shared client components (WalletProvider, ConnectBar, HistoryCharts)
  lib/           # API client + types
.github/workflows/
  refresh-data.yml  # daily cron
docs/superpowers/
  specs/         # design spec (locked)
  plans/         # implementation plan (locked)
MODEL_CARD.md   # model documentation + limitations
render.yaml     # API blueprint for Render deploy
```

## Run locally

```bash
# API
cd api
python -m venv .venv && source .venv/Scripts/activate  # Windows-flavored path
pip install -e ".[dev]"
cp ../.env.example ../.env  # then fill in your Helius + Supabase keys
python scripts/migrate.py
python scripts/refresh_all.py        # ~6 min
python scripts/predict_today.py
uvicorn stakesense.api.main:app --reload --port 8000

# web (in another terminal)
cd ../web
pnpm install
echo "NEXT_PUBLIC_API_BASE=http://localhost:8000" > .env.local
pnpm dev
```

## Hackathon

Built solo for [Solana Frontier (Colosseum)](https://colosseum.com/frontier), 2026-04-06 → 2026-05-11. Targeting Public Goods $10k tier (open-source) + sponsor bounties.

## License

MIT — see [LICENSE](LICENSE).
