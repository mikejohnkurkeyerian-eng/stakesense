# stakesense

Predictive validator quality oracle for Solana. ML-powered scoring on three pillars (downtime risk, MEV tax, decentralization) exposed as a public REST API + dashboard + wallet-integrated stake flow.

Status: Days 1–7 ✅ — backend + composite predictions + dashboard pages render. Awaiting validators.app token + Fly.io / Vercel deploys + accumulated history for ML training.

## Layout

- `api/` — Python (FastAPI + lightgbm) backend, ML pipeline, cron scripts
- `web/` — Next.js 14 dashboard + wallet integration
- `docs/superpowers/specs/` — design spec
- `docs/superpowers/plans/` — implementation plan

## License

MIT — see [LICENSE](LICENSE).
