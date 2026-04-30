"""Walk-forward training of the downtime classifier.

Uses target epochs in [first..last-30], holdout = last 30."""
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
from sqlalchemy import text

from stakesense.db import engine
from stakesense.training.dataset import build_walk_forward_examples
from stakesense.training.model import save_model, train_downtime


def main() -> None:
    with engine.begin() as conn:
        perf = pd.read_sql(text("SELECT * FROM epoch_performance"), conn)
        val = pd.read_sql(text("SELECT * FROM validators"), conn)
        mev = pd.read_sql(text("SELECT * FROM mev_observations"), conn)

    min_e = int(perf["epoch"].min()) + 6  # need rolling history
    max_e = int(perf["epoch"].max()) - 3  # need 3-epoch horizon
    train_end = max_e - 30
    eval_start = max_e - 30

    train_target_epochs = list(range(min_e, train_end))
    eval_target_epochs = list(range(eval_start, max_e))
    print(f"train epochs: {len(train_target_epochs)}, eval epochs: {len(eval_target_epochs)}")

    train_ex = build_walk_forward_examples(perf, val, mev, target_epochs=train_target_epochs)
    eval_ex = build_walk_forward_examples(perf, val, mev, target_epochs=eval_target_epochs)
    print(f"train examples: {len(train_ex)}, eval examples: {len(eval_ex)}")

    res = train_downtime(train_ex, eval_ex)
    print(f"AUC: {res.auc:.3f} | AP: {res.ap:.3f}")

    version = datetime.now(timezone.utc).strftime("downtime-%Y%m%d-%H%M")
    out = Path(__file__).resolve().parents[1] / "models" / f"{version}.joblib"
    out.parent.mkdir(exist_ok=True)
    save_model(res.model, out, version=version)
    print(f"saved {out}")
    print("top features:")
    for k, v in sorted(res.feature_importance.items(), key=lambda kv: -kv[1])[:10]:
        print(f"  {k}: {v:.0f}")


if __name__ == "__main__":
    main()
