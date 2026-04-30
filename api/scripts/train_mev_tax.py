"""Walk-forward training of the MEV-tax regressor."""
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
from sqlalchemy import text

from stakesense.db import engine
from stakesense.features.build import build_validator_features
from stakesense.features.static import add_static_features
from stakesense.training.model import save_model, train_mev_tax
from stakesense.training.targets import compute_mev_tax_target


def build_examples(perf, validators, mev, target_epochs, horizon=3):
    out = []
    for ep in target_epochs:
        rolling = build_validator_features(perf, target_epoch=ep)
        feats = add_static_features(rolling, validators, mev)
        targets = compute_mev_tax_target(perf, mev, target_epoch=ep, horizon=horizon)
        merged = feats.merge(targets, on="vote_pubkey", how="inner")
        merged["target_epoch"] = ep
        out.append(merged)
    return pd.concat(out, ignore_index=True) if out else pd.DataFrame()


def main() -> None:
    with engine.begin() as conn:
        perf = pd.read_sql(text("SELECT * FROM epoch_performance"), conn)
        val = pd.read_sql(text("SELECT * FROM validators"), conn)
        mev = pd.read_sql(text("SELECT * FROM mev_observations"), conn)

    if mev.empty:
        print("No MEV observations yet — skipping ML training; fallback to deterministic predictor.")
        return

    min_e = int(perf["epoch"].min()) + 6
    max_e = int(perf["epoch"].max()) - 3

    train_target_epochs = list(range(min_e, max_e - 30))
    eval_target_epochs = list(range(max_e - 30, max_e))

    train_ex = build_examples(perf, val, mev, train_target_epochs)
    eval_ex = build_examples(perf, val, mev, eval_target_epochs)
    print(f"train: {len(train_ex)}  eval: {len(eval_ex)}")

    if train_ex.empty or eval_ex.empty:
        print("Insufficient examples for MEV training — skipping.")
        return

    res = train_mev_tax(train_ex, eval_ex)
    print(f"MAE: {res.mae:.4f}")

    version = datetime.now(timezone.utc).strftime("mev-tax-%Y%m%d-%H%M")
    out = Path(__file__).resolve().parents[1] / "models" / f"{version}.joblib"
    out.parent.mkdir(exist_ok=True)
    save_model(res.model, out, version=version)
    print(f"saved {out}")


if __name__ == "__main__":
    main()
