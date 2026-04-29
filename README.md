# stakesense

Predictive validator quality oracle for Solana. ML-powered scoring on three pillars (downtime risk, MEV tax, decentralization) exposed as a public REST API + dashboard + wallet-integrated stake flow.

Status: Day 1 in progress — Solana Frontier hackathon (Colosseum, Apr–May 2026).

## Layout

- `api/` — Python (FastAPI + lightgbm) backend, ML pipeline, cron scripts
- `web/` — Next.js 14 dashboard + wallet integration
- `docs/superpowers/specs/` — design spec
- `docs/superpowers/plans/` — implementation plan

## License

MIT — see [LICENSE](LICENSE).
