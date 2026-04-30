CREATE TABLE IF NOT EXISTS validators (
  vote_pubkey      TEXT PRIMARY KEY,
  identity_pubkey  TEXT,
  name             TEXT,
  commission_pct   INTEGER,
  active_stake     BIGINT,
  data_center      TEXT,
  asn              TEXT,
  country          TEXT,
  jito_client      BOOLEAN,
  first_seen_epoch INTEGER,
  last_updated     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS epoch_performance (
  vote_pubkey      TEXT REFERENCES validators(vote_pubkey) ON DELETE CASCADE,
  epoch            INTEGER NOT NULL,
  credits          BIGINT,
  skip_rate        DOUBLE PRECISION,
  vote_latency     DOUBLE PRECISION,
  active_stake     BIGINT,
  delinquent       BOOLEAN,
  blocks_produced  INTEGER,
  blocks_expected  INTEGER,
  PRIMARY KEY (vote_pubkey, epoch)
);

CREATE TABLE IF NOT EXISTS mev_observations (
  vote_pubkey                 TEXT REFERENCES validators(vote_pubkey) ON DELETE CASCADE,
  epoch                       INTEGER NOT NULL,
  mev_revenue_lamports        BIGINT,
  mev_commission_pct          INTEGER,
  mev_to_delegators_lamports  BIGINT,
  PRIMARY KEY (vote_pubkey, epoch)
);

CREATE TABLE IF NOT EXISTS predictions (
  vote_pubkey            TEXT REFERENCES validators(vote_pubkey) ON DELETE CASCADE,
  prediction_date        DATE NOT NULL,
  model_version          TEXT NOT NULL,
  downtime_prob_7d       DOUBLE PRECISION,
  mev_tax_rate           DOUBLE PRECISION,
  decentralization_score DOUBLE PRECISION,
  composite_score        DOUBLE PRECISION,
  PRIMARY KEY (vote_pubkey, prediction_date)
);

CREATE INDEX IF NOT EXISTS idx_predictions_date ON predictions (prediction_date DESC);
CREATE INDEX IF NOT EXISTS idx_predictions_composite ON predictions (composite_score DESC);
CREATE INDEX IF NOT EXISTS idx_epoch_performance_epoch ON epoch_performance (epoch DESC);
