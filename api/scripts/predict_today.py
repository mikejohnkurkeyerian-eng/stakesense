"""Compute composite predictions: downtime + MEV tax + decentralization."""
from datetime import date
from pathlib import Path

from sqlalchemy import text

from stakesense.db import engine
from stakesense.features.pipeline import build_features_for_epoch
from stakesense.scoring.decentralization import compute_decentralization_score
from stakesense.training.model import FEATURE_COLS, load_model


W_DOWNTIME = 0.5
W_MEV = 0.3
W_DECENTRALIZATION = 0.2


def latest(prefix: str) -> Path | None:
    matches = sorted((Path(__file__).resolve().parents[1] / "models").glob(f"{prefix}-*.joblib"))
    return matches[-1] if matches else None


def main() -> None:
    dt_path = latest("downtime")
    if dt_path is None:
        raise RuntimeError("No downtime model on disk — run train_downtime.py first.")
    dt_payload = load_model(dt_path)

    mev_path = latest("mev-tax")
    mev_payload = load_model(mev_path) if mev_path else None
    print(
        f"downtime: {dt_payload['version']}, "
        f"mev: {mev_payload['version'] if mev_payload else 'fallback (deterministic)'}"
    )

    with engine.begin() as conn:
        max_epoch = conn.execute(text("SELECT MAX(epoch) FROM epoch_performance")).scalar()
    feats = build_features_for_epoch(target_epoch=max_epoch)
    feats = feats[~feats["insufficient_history"].fillna(False)].reset_index(drop=True)

    X = feats[FEATURE_COLS].fillna(-1)
    downtime_proba = dt_payload["model"].predict(X)
    if mev_payload is not None:
        mev_tax = mev_payload["model"].predict(X).clip(0, 1)
    else:
        latest_pct = feats["mev_commission_pct_latest"].fillna(10.0)
        mev_tax = (latest_pct / 100.0).clip(0, 1).to_numpy()
    decent = compute_decentralization_score(feats).set_index("vote_pubkey")["decentralization_score"]

    feats["downtime_prob_7d"] = downtime_proba
    feats["mev_tax_rate"] = mev_tax
    feats["decentralization_score"] = feats["vote_pubkey"].map(decent)
    feats["composite_score"] = (
        W_DOWNTIME * (1 - feats["downtime_prob_7d"])
        + W_MEV * (1 - feats["mev_tax_rate"])
        + W_DECENTRALIZATION * feats["decentralization_score"]
    )

    today = date.today()
    version = f"composite-{today.isoformat()}"
    rows = (
        feats[[
            "vote_pubkey", "downtime_prob_7d", "mev_tax_rate",
            "decentralization_score", "composite_score",
        ]]
        .assign(prediction_date=today, model_version=version)
        .to_dict(orient="records")
    )

    UPSERT = text(
        """
        INSERT INTO predictions (vote_pubkey, prediction_date, model_version,
                                  downtime_prob_7d, mev_tax_rate,
                                  decentralization_score, composite_score)
        VALUES (:vote_pubkey, :prediction_date, :model_version,
                :downtime_prob_7d, :mev_tax_rate,
                :decentralization_score, :composite_score)
        ON CONFLICT (vote_pubkey, prediction_date) DO UPDATE SET
            model_version = EXCLUDED.model_version,
            downtime_prob_7d = EXCLUDED.downtime_prob_7d,
            mev_tax_rate = EXCLUDED.mev_tax_rate,
            decentralization_score = EXCLUDED.decentralization_score,
            composite_score = EXCLUDED.composite_score
        """
    )
    with engine.begin() as conn:
        conn.execute(UPSERT, rows)
    print(f"wrote {len(rows)} composite predictions")


if __name__ == "__main__":
    main()
