# stakesense — Model Card

**What it is:** stakesense is an open-source predictive scoring service for Solana validators. It assigns each validator three pillar scores plus a composite, intended to help delegators choose where to stake.

**Status:** Hackathon-stage prototype. Predictions are public-good; not investment advice.

**Repo:** https://github.com/mikejohnkurkeyerian-eng/stakesense
**Live API:** https://stakesense.onrender.com/docs
**Live Dashboard:** https://stakesense-el77-git-main-california-mortgage-solutions.vercel.app

---

## Pillars

### 1. Downtime risk (`downtime_prob_7d`)

- **Type:** Binary classifier (LightGBM gradient-boosted trees).
- **Target:** 1 if a validator's `skip_rate > 5%` OR `delinquent = true` in any of the next 3 epochs (~6 days).
- **Features (~15 columns):** rolling 5-epoch stats — `skip_rate` mean/std/trend, `vote_latency` mean/drift, `credits` mean, recent-delinquent flag, `active_stake` change pct; static — `commission_pct`, `mev_commission_pct`, data-center / ASN / country concentration, stake percentile.
- **Training:** walk-forward across all available target epochs; eval = last 30. Output is a probability ∈ [0, 1].
- **Output column:** `downtime_prob_7d` ∈ [0, 1].

### 2. MEV tax (`mev_tax_rate`)

- **Type:** Continuous predictor; LightGBM regressor when sufficient history exists, deterministic fallback otherwise.
- **Target:** average `mev_commission_pct / 100` over the next 3 epochs (the fraction of MEV revenue the validator keeps for themselves vs. passes to delegators).
- **Fallback:** if Jito MEV history isn't yet long enough to train a regressor, use the validator's *current* `mev_commission_pct / 100`. Validators not running Jito are assigned a fixed 10% opportunity-cost floor.
- **Output column:** `mev_tax_rate` ∈ [0, 1].

### 3. Decentralization (`decentralization_score`)

- **Type:** Rule-based scorer (no ML).
- **Inputs:** validator's `data_center`, `asn`, `country`, and `active_stake` rank.
- **Logic:** for each cluster column, score = `1 − rank_pct(cluster_size)` so validators in rare clusters score higher. Validators in the top 30 by stake (superminority candidates) get penalized.
- **Output column:** `decentralization_score` ∈ [0, 1].

### Composite

`composite_score = 0.5 × (1 − downtime_prob_7d) + 0.3 × (1 − mev_tax_rate) + 0.2 × decentralization_score`

The weights reflect a delegator-centric view: avoiding downtime is the highest cost, MEV tax is the next leakage, decentralization is a directional preference. Weights are not learned; they're a transparent default. Future work: backtest different weight schemes against realized stake yield.

---

## Data

| Source | Frequency | Used for |
|---|---|---|
| Solana RPC (Helius) — `getVoteAccounts` | Per refresh | Validator list, identity↔vote mapping, current-epoch stake, current delinquent flag, last-5-epoch credits |
| Solana RPC — `getBlockProduction` | Per refresh | Current-epoch skip rate per validator (slot-range capped at 5,000 slots, so historical epochs unavailable from public RPC) |
| Jito Kobe API — `/api/v1/validators` | Per refresh | `mev_commission_bps` per Jito-running validator |
| validators.app — `/api/v1/validators/mainnet.json` | Per refresh (when token configured) | `data_center`, `asn`, `country`, validator name |

History accumulates over time via a twice-daily GitHub Actions cron (`refresh-data.yml`). Each run extends the window by ~0.5 epochs of fresh data. The model retrains and republishes predictions on every run.

### Known data limitations

1. **Historical skip rate is current-epoch-only at the start.** Stakewiz removed its per-epoch endpoint, and Helius caps `getBlockProduction` slot ranges to 5,000 slots (an epoch is 432K slots). Historical skip rates accumulate ~1 epoch per cron run. Implication: the downtime classifier is undertrained at the start of the project's life and improves over time.
2. **Per-validator MEV revenue is not exposed** by Jito's public API — only commission rate and current-epoch in-progress rewards. We capture commission as the tax signal.
3. **`vote_latency` is not yet collected.** Feature column exists in the schema for future use.
4. **Predictions are not investment advice.** Composite scores reflect a single transparent weighting; delegators with different preferences should view the underlying pillar scores and decide.

---

## Evaluation

- **Held-out:** for each cron training run, the most recent 30 target epochs are walk-forward eval; earlier epochs train.
- **Metric:** AUC for downtime, MAE for MEV tax.
- **Target:** AUC ≥ 0.75 once ≥ 30 epochs of skip-rate history have accumulated. Until then, AUC may be undefined or weak — `predict_today.py` falls back to a deterministic predictor (constant downtime, commission-as-MEV-tax) so the public scores remain stable.

---

## Reproducibility

- All code: https://github.com/mikejohnkurkeyerian-eng/stakesense
- Data sources are public APIs (Helius RPC, Jito Kobe, validators.app, Solana RPC).
- DB schema: `api/scripts/schema.sql`
- Training pipeline: `api/scripts/train_downtime.py`, `api/scripts/train_mev_tax.py`
- Inference pipeline: `api/scripts/predict_today.py`

---

## License

MIT — see [LICENSE](LICENSE).

---

## Disclosures

- Built solo for the [Solana Frontier Hackathon (Colosseum)](https://colosseum.com/frontier), 2026-04-06 → 2026-05-11.
- The composite weighting (0.5 / 0.3 / 0.2) is a default heuristic, not learned. Different delegator preferences will rank validators differently.
- The author has no validator delegations or partnerships at the time of submission.
