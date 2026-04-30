"""Backtest the composite strategy. Saves chart to api/notebooks/backtest.png."""
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd
from sqlalchemy import text

from stakesense.db import engine
from stakesense.scoring.backtest import simulate_strategies


def main() -> None:
    with engine.begin() as conn:
        perf = pd.read_sql(text("SELECT * FROM epoch_performance"), conn)
        preds = pd.read_sql(text("SELECT * FROM predictions"), conn)

    if preds.empty or perf.empty:
        print("Need predictions and epoch_performance populated first.")
        return

    last_epoch = int(perf["epoch"].max())
    epochs = list(range(last_epoch - 89, last_epoch + 1))

    res = simulate_strategies(perf, preds, epochs=epochs, top_k=20)

    out_dir = Path(__file__).resolve().parents[1] / "notebooks"
    out_dir.mkdir(exist_ok=True)
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))
    pivot_yield = res.yields.pivot(index="epoch", columns="strategy", values="yield")
    pivot_yield.plot(ax=axes[0], title="Yield (avg credits per epoch)")
    pivot_inc = res.incidents.pivot(index="epoch", columns="strategy", values="incidents")
    pivot_inc.plot(ax=axes[1], title="Skip incidents per epoch")
    fig.tight_layout()
    chart = out_dir / "backtest.png"
    fig.savefig(chart)
    print(f"saved {chart}")
    print("\nyield summary:")
    print(pivot_yield.mean())
    print("\nincident summary:")
    print(pivot_inc.sum())


if __name__ == "__main__":
    main()
