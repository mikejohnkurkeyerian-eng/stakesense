# stakesense

Predictive validator quality oracle for Solana. ML-powered scoring on three pillars (downtime risk, MEV tax, decentralization) exposed as a public REST API + dashboard + wallet-integrated stake flow.

Status: Days 1–7 ✅ — backend live, dashboard deploying, daily refresh cron running.

## Live

- **API:** https://stakesense.onrender.com (FastAPI on Render free tier — cold-starts after 15 min idle)
- **Dashboard:** https://stakesense-el77-git-main-california-mortgage-solutions.vercel.app
- **Cron:** GitHub Actions, twice daily (04:17 + 16:17 UTC) — refreshes data, retrains, writes new predictions

## Layout

- `api/` — Python (FastAPI + LightGBM) backend, ML pipeline, cron scripts
- `web/` — Next.js 16 dashboard + wallet integration
- `docs/superpowers/specs/` — design spec
- `docs/superpowers/plans/` — implementation plan
- `.github/workflows/` — daily refresh + retrain + predict workflow

## License

MIT — see [LICENSE](LICENSE).
