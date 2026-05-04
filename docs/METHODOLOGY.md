# Stakesense Methodology

> Long-form companion to [`MODEL_CARD.md`](../MODEL_CARD.md). The model card is the technical spec. This is the human-readable "why and how."

**Audience:** judges, validators, delegators, ML researchers, anyone evaluating whether to trust a stakesense score before staking SOL on a validator we recommend.

**TL;DR:** We score every active Solana mainnet validator on three pillars — downtime risk, MEV tax, decentralization — combine them into a transparent composite, and refresh predictions twice a day. Every step is open source, every input is public data, and the entire pipeline can be reproduced from a fresh clone in under 15 minutes.

---

## 1. Why predictive scoring matters for staking

Solana has ~800 active mainnet validators and ~$50B in staked SOL. When a delegator chooses where to stake, the choice has three direct economic consequences:

1. **Yield**: a validator that goes delinquent or has a high skip rate produces fewer block rewards per epoch. The delegator earns less.
2. **MEV leakage**: validators running Jito can keep up to 100% of MEV revenue, or share it with delegators via lower commissions. This number is variable and rarely surfaced in choosing flows.
3. **Network health**: each delegation either reinforces or weakens Solana's Nakamoto coefficient and geographic / hosting diversity.

Existing tools surface the *current* state of these dimensions but not the *trajectory*. A validator with a clean snapshot today can be on its way to delinquency next week. A validator with low MEV commission this epoch can have raised it twice in the last month. A validator in a small AWS region today can become part of a large cluster as new operators choose the same region for cheap bandwidth.

Stakesense fills the gap by treating validator quality as a forecastable target, not a snapshot.

## 2. Three-pillar architecture

We deliberately avoid a single black-box score. Three pillars, each with its own model and its own input data, lets delegators reason about what they're optimizing for:

- A yield-maximizing delegator might down-weight decentralization
- A network-aligned delegator might up-weight decentralization
- A risk-averse delegator might cap by downtime probability before considering anything else

Each pillar produces a value in `[0, 1]` and a documented training target.

### Pillar 1 — Downtime risk

**Question we answer:** "What is the probability this validator will skip too many blocks or go delinquent in the next ~6 days (3 epochs)?"

**Why this question:** Delinquency = zero rewards. Skip-rate spikes = reduced rewards. These are the largest negative cashflow events a delegator can suffer; predicting them is the highest-impact pillar.

**Input features (rolling 5-epoch windows):**
- `skip_rate_mean_5e` — mean of last 5 epochs' skip rates
- `skip_rate_std_5e` — variance signal; volatile validators correlate with trouble
- `skip_rate_trend_5e` — slope of a linear fit; captures degrading vs. improving
- `vote_latency_mean_5e` — placeholder, not yet ingested live (planned)
- `vote_latency_drift` — placeholder, not yet ingested live (planned)
- `credits_mean_5e` — average credits earned per epoch
- `delinquent_recent` — binary, was this validator delinquent in any of the last 5 epochs
- `active_stake_change_pct_5e` — relative stake change; sudden drops can signal operator-side issues
- `history_epochs` — count of valid windowed epochs (used to weight, not as feature)
- `commission_pct` — current commission as static input

**Model:** LightGBM gradient-boosted trees. Walk-forward eval (most recent 30 target epochs held out).

**Why LightGBM:** robust to missing data (history is sparse early), fast on small N, well-supported on free Render tier, doesn't need GPU.

**Output:** `downtime_prob_7d ∈ [0, 1]`.

**Calibration note:** while early in the cohort's life the per-epoch history is thin (Helius caps `getBlockProduction` to 5K-slot ranges = ~1 epoch per refresh), AUC is unstable. We protect downstream consumers via a deterministic fallback in `predict_today.py` so composite scores remain rank-ordered and useful even when the trained model is degenerate. As history accumulates, the trained model takes over and AUC stabilizes — `MODEL_CARD.md` has the latest target.

### Pillar 2 — MEV tax

**Question we answer:** "How much of MEV revenue will this validator keep for itself instead of passing to delegators in the coming epochs?"

**Why this question:** Jito-equipped validators can extract significant MEV revenue, then choose what fraction to share with delegators via commission rates. A delegator who picks based on staking commission alone misses the second commission layer. MEV-aware ranking exposes the leakage.

**Input features:**
- Current `mev_commission_bps` from Jito Kobe API
- Historical mev_commission rolling window (when long enough)
- Validator stake percentile (high-stake operators have stronger pricing power)

**Model:** LightGBM regressor when ≥ N training examples accumulated. Falls back to deterministic predictor (`mev_commission_bps / 10000`) for newly observed validators or low-history scenarios.

**Output:** `mev_tax_rate ∈ [0, 1]`.

**Honest limit:** Jito's public API does not expose per-validator per-epoch MEV revenue, only commission rate and current-epoch in-flight rewards. So we capture the commission rate as the proxy. A more sophisticated future version would compute realized vs. retained MEV per epoch, but that requires either Jito private data or per-epoch payout reconstruction from Solana txs.

### Pillar 3 — Decentralization

**Question we answer:** "If a delegator stakes here, do they make the network more or less centralized?"

**Why this question:** Solana's resilience to single-data-center outages, single-ASN failures, and single-jurisdiction regulation pressure depends on hosting diversity. Each new delegation tilts the network. The Solana Foundation publishes the Nakamoto coefficient as a tracked metric — stakesense surfaces validator-level contributions to that metric.

**Inputs:** validators.app metadata — `data_center_key`, `asn`, `country` — plus the `active_stake` distribution.

**Logic:** rule-based, no ML.

For each cluster axis (data_center, ASN, country):
1. Compute the cluster size for the validator's bucket
2. Score = `1 − rank_pct(cluster_size)` — validators in rare clusters score higher
3. Apply a superminority penalty: validators inside the top-N stake bracket where their cumulative stake passes 33% are penalized; validators outside are not

The pillar score is the average across the three axes minus the superminority penalty.

**Why rule-based:** decentralization is a network-health *value statement*, not a learnable function. We choose a transparent rule rather than train a model that might encode whatever weighting our training data happened to have.

### The composite

```
composite = 0.5 × (1 − downtime_prob_7d)
          + 0.3 × (1 − mev_tax_rate)
          + 0.2 × decentralization_score
```

Weights are deliberate, not learned:
- **Downtime is weighted highest** because it's the largest realized economic loss event for a delegator. A 5% skip-rate spike on a high-stake validator can cost an annualized basis-point figure that dwarfs MEV considerations.
- **MEV tax is second** because it's a recurring leakage, not a tail event.
- **Decentralization is third** because it's network-health, not delegator-cashflow. We chose 20% so that two near-identical validators in different data centers will rank differently, but a great-yield validator won't be penalized to last because of one shared ASN.

A future version (or a future delegator) is welcome to fork the repo and use different weights — every input is published, the formula is one line, and the validators page already supports custom weight overrides via query string (`/validators?w_downtime=0.7&w_mev=0.2&w_dec=0.1`).

## 3. Data pipeline

```
   ┌──────────────────────┐
   │ Solana RPC (Helius)  │  getVoteAccounts, getBlockProduction
   ├──────────────────────┤
   │ Jito Kobe API        │  /api/v1/validators (commission_bps)
   ├──────────────────────┤
   │ validators.app       │  data_center, asn, country, name
   └──────────────────────┘
                │
                ▼
        refresh_all.py        (~6 min E2E, idempotent upserts)
                │
                ▼
       ┌───────────────────┐
       │ Postgres          │  validators, epoch_performance,
       │ (Supabase)        │  mev_observations, predictions
       └────────┬──────────┘
                │
                ▼
        train_downtime.py    (LightGBM on rolling-window features)
        train_mev_tax.py     (LightGBM regressor or fallback)
                │
                ▼
        predict_today.py     (composite scoring + decentralization)
                │
                ▼
        FastAPI service      (sub-second p99 query)
                │
                ▼
        Dashboard, MCP, widget, CSV exports
```

**Refresh cadence:** twice a day (04:17 and 16:17 UTC) via GitHub Actions. Each run extends history by ~0.5 epoch.

**Idempotency:** every refresh upserts; re-running a job is safe. The training pipeline always writes to a timestamped joblib (`models/downtime-YYYYMMDD-HHMM.joblib`) and the predictor loads the latest.

**Schema integrity:** `tests/test_validators_repo.py` runs against the live database using a sentinel test pubkey, so production data is never trampled.

## 4. Backtest

`/backtest` compares strategies over our historical predictions:

- **Top-3 by composite** — equal-weight stake among the top three predicted validators
- **Top-10 by composite** — equal-weight among top ten
- **Top-3 by yield only** — naive baseline
- **Random sample** — control

Each strategy is rolled forward by epoch, with rebalances permitted at refresh boundaries. Returns are estimated from realized epoch credits, scaled by stake share.

We **do not** claim to predict realized SOL yield perfectly — block rewards and MEV vary epoch to epoch. The backtest demonstrates that *trained* strategies outperform random and outperform pure-yield-chasing, especially when ranked over multi-week windows.

**Caveats:**
- Early-cohort epochs (before significant history accumulated) have high noise.
- The deterministic-fallback predictor produces stable rank-orders but won't show the lift a properly trained model will once history fills in.

## 5. Limitations and honest disclosures

- **Mainnet stake flow is not yet wired** — the `/stake` page connects to **devnet**. Mainnet support is a post-hackathon priority.
- **Slashing risk is not modeled** — Solana doesn't have classical slashing today, but a future cluster upgrade may. Stakesense currently captures only soft-failure (skip rate, delinquency) and economic (MEV tax) signals.
- **Composite weights are heuristic** — see Section 2.
- **Historical depth is bounded** by Helius RPC and how long the cron has been running. New observers see lower AUC.
- **Validator name and metadata** depend on validators.app. A validator that hasn't registered there will have empty data_center/ASN/country fields and a default decentralization score.

We treat these as visible-by-design rather than as bugs. Every limitation is surfaced in `MODEL_CARD.md`, this document, and on the `/methodology` page so delegators see the full picture before they stake.

## 6. Reproducibility

```bash
git clone https://github.com/mikejohnkurkeyerian-eng/stakesense
cd stakesense

# API
cd api
python -m venv .venv && source .venv/Scripts/activate
pip install -e ".[dev]"
cp ../.env.example ../.env
# Fill in HELIUS_API_KEY, SUPABASE_URL, DATABASE_URL,
#         SUPABASE_SERVICE_ROLE_KEY, VALIDATORS_APP_TOKEN
python scripts/migrate.py
python scripts/refresh_all.py
python scripts/train_downtime.py
python scripts/train_mev_tax.py  # may skip with insufficient data
python scripts/predict_today.py
uvicorn stakesense.api.main:app --reload --port 8000

# Web (separate terminal)
cd ../web
pnpm install
echo "NEXT_PUBLIC_API_BASE=http://localhost:8000" > .env.local
pnpm dev
```

Total time on a fresh machine: ~15 minutes. The pipeline is fully scripted; no manual SQL or hand-tuning needed.

## 7. Future research directions

We deliberately scoped narrow for the hackathon. The natural follow-ons:

1. **Validator reputation timeline** — surface a per-validator "score over time" with annotated events (commission changes, delinquency, MEV jumps) for delegators to see trajectories at a glance.
2. **Slashing-risk modeling** when Solana introduces it.
3. **Per-delegator personalized weights** — let users save preferences (yield-max, network-max, balanced) and remix the composite from their wallet.
4. **Cross-validator stake migration recommender** — given a current portfolio, what reallocations improve all three pillars simultaneously?
5. **MEV revenue reconstruction** — instead of using commission as a tax proxy, reconstruct per-validator per-epoch MEV from on-chain data and Jito-stage data.
6. **Concentration alerts** — push notifications when a stake delegation would cross a Nakamoto-coefficient threshold.
7. **Multi-cluster support** — testnet, devnet variants for validator operators to monitor before mainnet promotions.

## 8. Why we believe this is a public good

Validator quality data is the kind of infrastructure that benefits Solana most when it's open and uniform across all consumers. If only one wallet has access to predictive scores, delegators using other wallets are systemically disadvantaged. If only one DAO has access, retail delegators are disadvantaged.

By open-sourcing every component — model code, training data, predictions, and dashboard — and publishing daily CC-BY snapshots, stakesense becomes a substrate that any wallet, exchange, dashboard, or DAO can integrate. We expect it to be most valuable not as a destination but as a building block.

---

**Questions / corrections / pull requests welcomed.**
[github.com/mikejohnkurkeyerian-eng/stakesense](https://github.com/mikejohnkurkeyerian-eng/stakesense)
