# Predictive Validator Quality Oracle for Solana — Design Spec

- **Status:** approved during brainstorming on 2026-04-28; ready for implementation-plan phase
- **Author:** solo builder (AI/ML + full-stack, learning Solana on the fly)
- **Hackathon:** Solana Frontier (Colosseum), 2026-04-06 → 2026-05-11
- **Build window:** 2026-04-28 → 2026-05-11 (14 calendar days; 12 build + 1 buffer + 1 submission)
- **Target prize tiers:** top-20 standout ($10k) + Public Goods ($10k) + 1–2 sponsor bounties (Phantom, Privy, Squads, possibly Arcium). Realistic take-home target: $15k–$30k. Not optimizing for Grand Champion or accelerator placement.
- **Working name:** TBD (placeholder: "StakeSense" / "Lighthouse" / "ValidatorVision" — pick later)

---

## 1. Problem & Opportunity

Solana stake is a $50B+ market. Stakers — both retail and institutional — pick validators with very limited information: most pick by stake size (which is anti-decentralization) or by yield (which is gameable through MEV commission obfuscation). Existing tools either show retrospective stats (Stakewiz, Validators.app) or are proprietary internal scorers (Marinade, Jito's Steward). There is **no public, predictive, ML-driven validator quality oracle** that retail stakers, liquid-staking protocols, and DAO treasuries can integrate.

The validator address surface is also a verified competitive gap: SolEnrich and other Solana intelligence services do not cover validators. Within the Colosseum builder corpus (5,400+ projects), there is no head-on competitor for predictive validator quality scoring as of 2026-04-28 (verified via Copilot search).

**Two ML problems that justify this product:**
1. **Predicting validator downtime / skip-rate spikes 7 days out.** Operationally meaningful — if I can warn stakers before a validator turns delinquent, I save them an epoch of zero rewards.
2. **Predicting MEV-tax (effective MEV-yield-loss to delegators) 7 days out.** Combines validator commission, Jito-client status, and historical MEV revenue patterns. Stakers currently can't compare apples-to-apples on this.

**Plus one deterministic signal:**
3. **Decentralization impact** — penalizes validators that concentrate stake in already-saturated data centers, ASNs, or geographies; rewards validators that improve Nakamoto coefficient.

A composite score blends the three.

---

## 2. Solution: One-Sentence Pitch

> An ML-powered, open-source service that predicts Solana validator behavior (downtime, MEV extraction from delegators, decentralization impact) and exposes it as a public dashboard, REST API, and wallet-integrated staking recommendation — so stakers earn more and Solana gets more decentralized.

---

## 3. Why This Wins the Frontier Lanes We Care About

| Lane | Mechanism |
|---|---|
| **Top-20 standout ($10k)** | Underserved address surface (validators); real ML moat (predictive, not just retrospective); demoable wow moment in the video; backtested credibility chart on the methodology page. |
| **Public Goods ($10k)** | MIT-licensed, public API with no auth wall, public model card and threat model, open training data and reproducible pipeline. |
| **Phantom sponsor bounty** | First-class Phantom wallet integration on the `/stake` flow. |
| **Privy sponsor bounty** | First-class Privy embedded-wallet integration on the same flow. |
| **Squads / Altitude bounty (stretch)** | DAO-treasury staking variant — "stake your treasury via multisig with predictive validator picks." Listed as future work; demoed only if Day 11 has time. |
| **Solana Foundation alignment (judge halo, not a prize tier)** | Nakamoto-coefficient narrative; explicit decentralization scoring. |

**Direct competitor check (2026-04-28):** None head-on. Adjacent projects: EPOCH (Renaissance — LLM Q&A about staking, not predictive scoring), Solpipe (validator-side MEV — opposite player), Lasagna Finance (LST yield optimization — different problem), Nodevest (tokenized validator nodes — different problem), Oblio (confidential staking platform — different problem).

---

## 4. Scope & MVP Boundary

### 4.1 In MVP (must ship)

1. **Predictive ML model** — predicts each validator's next-7-day risk on:
   - (a) downtime / skip-rate spike probability
   - (b) MEV-tax rate to delegators
   - Trained on rolling-window features over 200+ historical epochs.
2. **Deterministic decentralization score** — penalizes superminority concentration; rewards geographic / DC / ASN diversity.
3. **Composite score** — weighted blend of the above three pillars.
4. **Public REST API** — `/validators`, `/validators/:pubkey`, `/recommend`, `/backtest`, `/health`. Public, no auth, 60 req/min/IP.
5. **Public dashboard** — landing, validators table, validator detail, stake flow, methodology, about.
6. **Wallet integration demo** — Phantom (via `@solana/wallet-adapter-react`) AND Privy (via `@privy-io/react-auth`). Same `/stake` flow uses standard `StakeProgram.delegate` — no custom on-chain code.
7. **Open-source repo** — public on GitHub from Day 1, MIT license, README, MODEL_CARD.md, THREAT_MODEL.md.

### 4.2 Deferred (NOT in MVP — listed as "future work" in submission)

- On-chain oracle: publishing scores via a Solana program (4–5 days, no MVP value)
- Arcium confidential queries (too heavy for 12 days)
- LST creation / auto-restaking / yield optimization
- Multi-wallet support beyond Phantom + Privy
- Telegram / Slack / email alert bots
- Native mobile app
- AI-generated natural-language score explanations (LLM layer) — moat is the predictive model, not an LLM wrapper
- Squads multisig variant (stretch only if Day 11 has time)

### 4.3 The Demo's Wow Moment

> Live query: pick a top-100 validator by stake → our model says "47% downtime probability next 7 days, MEV tax 1.8% of yield" → switch to recommended alternative → projected +2.1% APY, decentralization-positive → user signs `StakeProgram.delegate` tx in Phantom → done.

This single 30-second sequence is the centerpiece of the demo video.

---

## 5. Architecture

```
                ┌─ Solana RPC / Helius / Stakewiz / Jito MEV API / Validators.app
                ↓ (data-refresh cron: every 30 min during the build for fast iteration; once per epoch (~2 days) in prod)
                ↓ (training cron: daily, retrains the model + writes a fresh `predictions` row for every validator)
         ┌──────────────────────────────┐
         │ Postgres (Supabase)          │
         │  validators                  │
         │  epoch_performance           │
         │  mev_observations            │
         │  predictions                 │
         └──────────────────────────────┘
                ↑                   ↑
                │                   │
   ┌────────────┴────────┐  ┌───────┴──────────────┐
   │ FastAPI (Fly.io)    │  │ Training pipeline    │
   │  /validators        │  │  (Python, lightgbm)  │
   │  /:pubkey           │  │  daily cron          │
   │  /recommend         │  │  writes predictions  │
   │  /backtest          │  └──────────────────────┘
   │  /health            │
   └────────────┬────────┘
                │
   ┌────────────┴───────────────────────┐
   │ Next.js dashboard (Vercel)         │
   │  Tailwind + shadcn/ui              │
   │  @solana/wallet-adapter-react      │
   │  @privy-io/react-auth (Solana)     │
   └────────────────────────────────────┘
                │
                ↓
   User browser → connect Phantom or Privy → /stake flow → fetch /recommend → render top 3 → sign StakeProgram.delegate tx
```

**Inference pattern:** Train daily (cron), write predictions table, API serves from there. No live ML inference. API latency target: p95 < 50 ms.

---

## 6. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| ML / data | Python 3.11, lightgbm, pandas, sqlalchemy | Strong on tabular data; no GPU needed; fast iteration |
| Backend API | FastAPI | Async, OpenAPI auto-docs, same Python runtime as ML |
| Database | Supabase Postgres | Free tier covers this scale; managed; instant API for rapid prototyping |
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui | Vercel-native; SSR for shareable validator pages; professional look |
| Wallets | `@solana/wallet-adapter-react` (Phantom) + `@privy-io/react-auth` (Privy) + `@solana/web3.js` | Standard, well-documented; covers both wallet integrations |
| Hosting | Vercel (frontend) + Fly.io (FastAPI + cron) | Free tiers cover this; both judge-friendly |
| Repo | Single public monorepo on GitHub from Day 1 | One source of truth; Public Goods qualification |

**Alternative considered + rejected:** Pure TypeScript/Node stack. Rejected because tabular ML in JS (TensorFlow.js) is meaningfully weaker than Python's lightgbm, and the user's strength is in Python. Stack uniformity isn't worth the ML quality hit.

**No on-chain code written by us.** We use Solana's built-in `StakeProgram` directly. No Anchor, no IDL, no audit risk, no devnet wrangling beyond standard wallet ops.

---

## 7. Data Sources

| Source | What we pull | Role |
|---|---|---|
| Solana RPC (`getVoteAccounts`, `getInflationReward`, `getEpochInfo`) | Current state; per-epoch rewards | Canonical; free; backup for everything below |
| Stakewiz API (`api.stakewiz.com`) | Historical per-epoch performance: skip rate, credits, vote latency, delinquency | Saves us aggregating raw RPC across 200+ epochs |
| Jito Steward API + Jito MEV public data | MEV revenue, MEV commission, Jito-client status per validator | Required for MEV-tax pillar |
| Validators.app API | Data center, ASN, country, hardware tier | Required for decentralization pillar |
| Solana Foundation Delegation Program data | SFDP scoring methodology and accepted-validator list | Backtest comparison (us vs SFDP vs random) |
| Helius enhanced RPC | Backfill backup if Stakewiz rate-limits | Fallback only |

**Risk: API flakiness or rate limits** on Day 1–2. Mitigation: build the raw-RPC + Jito-dashboard-scraper fallbacks on Day 1, not Day 2.

---

## 8. Postgres Schema (sketch — final shape decided in implementation)

```sql
validators (
  vote_pubkey      TEXT PRIMARY KEY,
  identity_pubkey  TEXT,
  name             TEXT,
  commission_pct   INT,
  active_stake     BIGINT,
  data_center      TEXT,
  asn              TEXT,
  country          TEXT,
  jito_client      BOOLEAN,
  first_seen_epoch INT,
  last_updated     TIMESTAMPTZ
);

epoch_performance (
  vote_pubkey   TEXT REFERENCES validators(vote_pubkey),
  epoch         INT,
  credits       BIGINT,
  skip_rate     FLOAT,
  vote_latency  FLOAT,
  active_stake  BIGINT,
  delinquent    BOOLEAN,
  blocks_produced INT,
  blocks_expected INT,
  PRIMARY KEY (vote_pubkey, epoch)
);

mev_observations (
  vote_pubkey               TEXT REFERENCES validators(vote_pubkey),
  epoch                     INT,
  mev_revenue_lamports      BIGINT,
  mev_commission_pct        INT,
  mev_to_delegators_lamports BIGINT,
  PRIMARY KEY (vote_pubkey, epoch)
);

predictions (
  vote_pubkey            TEXT REFERENCES validators(vote_pubkey),
  prediction_date        DATE,
  model_version          TEXT,
  downtime_prob_7d       FLOAT,
  mev_tax_rate           FLOAT,
  decentralization_score FLOAT,
  composite_score        FLOAT,
  PRIMARY KEY (vote_pubkey, prediction_date)
);
```

---

## 9. ML Model

### 9.1 The Three Pillars

| Pillar | Method | Type |
|---|---|---|
| Downtime risk (next 7 days = next ~3 epochs) | LightGBM binary classifier; target = "skip_rate > 5% OR delinquent in any of the next 3 epochs" | ML |
| MEV tax (next 7 days) | LightGBM regression; target = "expected fraction of delegator's potential yield NOT received." Operationally: for Jito-client validators, this = MEV commission % × MEV-share-of-yield. For vanilla-client validators, this = the counterfactual MEV they would have captured had they run Jito (treated as opportunity cost to the delegator) | ML |
| Decentralization impact | Deterministic rules: penalty if same DC/ASN/country as superminority validators; bonus if outside top-50 stake clusters | Pure rules |

Composite = `w_downtime * (1 - downtime_prob) + w_mev * (1 - mev_tax) + w_decentralization * decentralization_score`. Weights tuned against backtest.

### 9.2 Features (~25 per validator)

Rolling-window stats over last 5 epochs:
- skip_rate mean, std, trend (slope)
- credits-percentile relative to network median
- vote-latency mean and drift (current vs 5-epoch avg)
- delinquent-recent (delinquent in last 3 epochs)
- restart-cadence proxy (jumps in vote-latency)
- active_stake change percentage
- commission changes in last 10 epochs

Static / current:
- MEV commission %
- Jito-client flag
- data center, ASN, country
- stake-rank percentile
- age in epochs
- count of validators in same DC/ASN/country

### 9.3 Training Methodology

- Walk-forward validation: train on epochs 1..N, predict N+1..N+3, slide forward
- Train data: last ~200 epochs (Stakewiz cap)
- Holdout: last 30 epochs for final eval
- Hyperparameter tuning: lightgbm defaults + early stopping on `n_estimators`. No exhaustive grid search.

### 9.4 Evaluation

- **Downtime classifier:** AUC-ROC ≥ 0.75 target; precision among top-50 most-flagged validators.
- **MEV-tax regressor:** MAE, R² on holdout.
- **Composite + portfolio backtest (the demo killer chart):** simulate "stake 1000 SOL using our top-K recs vs random vs Solana Foundation Delegation Program" over the last 90 epochs, plot realized yield + safety delta. This is the centerpiece of the methodology page.

### 9.5 Honest Caveats — to be Surfaced in MODEL_CARD.md

- **MEV-tax measurement honesty.** Jito MEV is well-tracked, but non-Jito-client validators don't capture MEV at all — so framing them as "extracting MEV tax" would be wrong. Honest framing in UI: "this validator runs vanilla Solana — you miss out on ~X% MEV yield" vs "this validator's Jito commission is 90%."
- **Cold start.** Validators with <10 epochs of history can't be predicted; we flag as "insufficient data" rather than guess.
- **Historical data depth.** If Stakewiz's actual depth is shallower than claimed, the holdout window shrinks. Day 1–2 backfill is the truth check.
- **Adversarial gaming.** A validator could selectively underperform during non-prediction windows or adjust commission strategically. Documented in THREAT_MODEL.md.

---

## 10. Public REST API (v1)

```
GET  /api/v1/validators
       ?sort=composite|downtime|mev_tax|decentralization
       &risk=conservative|balanced|aggressive
       &limit=50 &offset=0
     → paginated list with all 3 pillar scores

GET  /api/v1/validators/:vote_pubkey
     → full detail: current scores, 90-epoch history, raw stats,
       decentralization context, plain-English explanations

POST /api/v1/recommend
     body: { amount_sol, risk_profile, count?: 3, exclude_clusters?: bool }
     → top-K recommendations with reasoning snippets, designed for wallet integration

GET  /api/v1/backtest
       ?strategy=ours-balanced|ours-conservative|foundation|random
       &epochs=90
     → backtested yield + safety series, JSON-ready for charts

GET  /api/v1/health → { ok, last_update_epoch, model_version }
```

- Public, no API key required (Public Goods angle)
- Rate limit: 60 req/min/IP, simple in-memory bucket
- CORS open
- OpenAPI docs auto-served at `/docs` (FastAPI default)

---

## 11. Dashboard (Next.js App Router)

| Route | Purpose |
|---|---|
| `/` | Landing — hero, 3 anchor stats, CTAs to validators table and stake flow |
| `/validators` | Sortable, filterable, searchable table; primary browse surface |
| `/validators/[vote_pubkey]` | Detail: score card, 3-pillar breakdown, history charts, decentralization context, "Stake here" CTA |
| `/stake` | Amount input → risk preference → wallet connect → top-3 recs → user picks → sign tx → success |
| `/methodology` | Model explanation, **the backtested portfolio chart** (the credibility centerpiece), MODEL_CARD link, repo link |
| `/about` | Repo, license, roadmap, future work |

Charts: `recharts`. Mobile responsive via Tailwind defaults.

---

## 12. Wallet Integration Flow

- **Phantom** via `@solana/wallet-adapter-react` (extension-detected; mobile via deeplink)
- **Privy** via `@privy-io/react-auth` with Solana plugin (email / social sign-in, embedded wallet for users without Phantom)
- Connect modal offers both; same downstream stake flow
- Tx flow: `StakeProgram.createAccount` (rent-exempt + amount) → `StakeProgram.delegate` to chosen vote account
- Devnet-first development; mainnet deploy on Day 11 with a small (1 SOL) real stake for the demo video

---

## 13. Open-Source / Public-Goods Posture

- **License:** MIT
- **Repo structure:** monorepo — `/api`, `/web`, `/scripts`, `/notebooks`, root `README.md`
- **README.md:** problem, approach, live demo URL, screenshots, one-command repro of model training (`make train`)
- **MODEL_CARD.md:** training data sources, evaluation results, what the model can/can't do, known biases, honest caveats
- **THREAT_MODEL.md:** adversarial scenarios, gameability of the score, what's out of scope
- **CONTRIBUTING.md:** for post-hackathon community
- **GitHub Actions:** CI tests + nightly model retrain + auto-deploy
- All scoring data exposed via the public API, no auth wall

---

## 14. 12-Day Milestone Plan

| Day | Date | Deliverable | Cap (don't exceed) |
|---|---|---|---|
| 1 | Tue 4-28 | Repo + Supabase + project skeleton + first successful `getVoteAccounts` pull | No models yet, no UI |
| 2 | Wed 4-29 | Full historical backfill done (Stakewiz + Jito + Validators.app, 200 epochs) + cron job scaffolded | Don't touch features yet |
| 3 | Thu 4-30 | Feature engineering complete (rolling-5-epoch + static features), EDA notebook eyeballing them | No model fit yet |
| 4 | Fri 5-01 | Downtime classifier (LightGBM) trained, walk-forward validated, AUC-ROC ≥ 0.75 target | One model only |
| 5 | Sat 5-02 | MEV-tax regressor + deterministic decentralization rules + composite score + backtest v0.5 chart | Don't tune endlessly |
| 6 | Sun 5-03 | FastAPI live on Fly.io: `/validators`, `/:pubkey`, `/recommend`, `/backtest`, `/health` + OpenAPI docs | No frontend yet |
| 7 | Mon 5-04 | Next.js dashboard deployed to Vercel: `/validators` table + `/validators/[pubkey]` detail with API data | No charts yet |
| 8 | Tue 5-05 | Dashboard polish: landing page, history charts, search/sort/filter, mobile responsive | No wallet yet |
| 9 | Wed 5-06 | Phantom integration: connect → /stake flow → `StakeProgram.delegate` tx end-to-end on devnet | Privy comes tomorrow |
| 10 | Thu 5-07 | Privy integration added to same flow; both wallets work on devnet | Don't redesign UX |
| 11 | Fri 5-08 | `/methodology` page + backtest chart export + MODEL_CARD.md + THREAT_MODEL.md + mainnet API deploy + 1 SOL real-stake test | Bug-fix only beyond this |
| 12 | Sat 5-09 | Demo video (~3 min: problem → walkthrough → backtest credibility → CTA) + Colosseum submission written | No new features |
| 13 | Sun 5-10 | Buffer day — fix anything broken, sponsor Discord outreach (Phantom/Privy/Squads/Arcium), social tweet thread | Resist new features |
| 14 | Mon 5-11 | Final QA on live demo, submit before deadline | Don't change code |

**Daily protocol:**
- Start each day reviewing the previous day's deliverable on the *live* URL (not just locally).
- Stop adding features the moment that day's cap is hit, even if there's time left — bank time toward the buffer day.
- If any day overruns by 6+ hours, the buffer day is consumed for that overrun, not for new work.

---

## 15. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Data-source flakiness (Stakewiz down, Jito rate-limit) | Build raw-RPC + Jito-dashboard-scraper fallbacks on Day 1, not Day 2 |
| Wallet-integration learning curve (first time on Day 9–10) | Spike a "hello world" Phantom connect on Day 6 evening (10 minutes); Privy quickstart bookmarked |
| Free-tier hosting limits hit on demo day | Pre-warm Fly.io and Vercel before recording demo; have $20 paid-tier upgrade ready as contingency |
| Day overruns cascade into demo / submission days | Buffer day exists for this; if buffer is consumed, ship a smaller backtest chart and skip Privy (Phantom alone is acceptable fallback) |
| Sponsor bounty fit may not be exact | Submit to Phantom + Privy bounties (high-confidence fits); Squads + Arcium are stretch shots if time permits |
| Adversarial gaming of the score | Documented in THREAT_MODEL.md; not a 12-day problem |

---

## 16. Hard Cuts (will NOT do, listed for sanity-check during build)

- Custom Solana program / Anchor / on-chain oracle deploy
- Arcium / confidential compute
- LST creation / auto-restaking / yield optimization
- Telegram / Slack / email alert bots
- Multi-chain anything
- Native mobile app
- AI-generated natural-language explanations (LLM layer)
- Multi-wallet support beyond Phantom + Privy

If any of these surface as "wouldn't it be cool if..." during the build, the answer is no until after submission.

---

## 17. Glossary

- **Epoch** — Solana's epoch is ~2 days; ~182 epochs/year. Validators' performance is naturally measured per epoch.
- **Skip rate** — fraction of leader slots a validator failed to produce a block in.
- **Delinquent** — validator has missed enough recent votes that the network considers it offline.
- **MEV (Maximum Extractable Value)** — value extractable by transaction ordering. On Solana, primarily captured by validators running the Jito-Solana client. Validators take a commission on MEV revenue and pass the rest to delegators.
- **Jito-Solana** — third-party validator client that captures MEV. Vanilla Solana clients don't capture MEV at all.
- **MEV commission** — % of MEV revenue the validator keeps before passing to delegators (separate from regular vote-cost commission).
- **Nakamoto Coefficient** — minimum number of validators that, colluding, could halt the chain. Higher is more decentralized.
- **Superminority** — the smallest number of validators whose combined stake can halt finality (~33% of stake). Solana's superminority is ~20–30 validators.
- **SFDP** — Solana Foundation Delegation Program; existing Foundation-run validator scoring + delegation system. Our backtest baseline.
- **`StakeProgram.delegate`** — built-in Solana program instruction for delegating a stake account to a validator's vote account. We use it; we don't reimplement it.

---

## 18. Out-of-Spec (resolve during implementation-plan phase, not now)

- Working name + branding
- Exact composite-score weight values (will be tuned during Day 5 backtest)
- Repo name on GitHub
- Domain name
- Whether to use Helius's RPC URL or public Solana RPC for production (latency + rate-limit decision)
- Whether to host the cron job inside the Fly.io app or as a separate Fly.io worker
- Specific shadcn/ui components to install
- Exact chart library (recharts vs chart.js — recharts is the default unless we hit a wall)

---

*End of design spec. Implementation plan to be written next via `superpowers:writing-plans`.*
