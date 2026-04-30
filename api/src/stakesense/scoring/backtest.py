from dataclasses import dataclass

import pandas as pd


@dataclass
class BacktestResult:
    yields: pd.DataFrame
    incidents: pd.DataFrame


def simulate_strategies(
    perf: pd.DataFrame,
    predictions: pd.DataFrame,
    *,
    epochs: list[int],
    top_k: int = 20,
) -> BacktestResult:
    """For each epoch, pick top-K validators by composite_score from predictions
    available *as of* that epoch, equally weight, sum realized credits-as-yield."""
    out_yield = []
    out_inc = []
    for ep in epochs:
        ours = (
            predictions.sort_values("composite_score", ascending=False)
            .head(top_k)["vote_pubkey"]
            .tolist()
        )
        random_pick = (
            predictions.sample(min(top_k, len(predictions)), random_state=ep)["vote_pubkey"].tolist()
        )
        baseline = (
            predictions.sort_values("decentralization_score", ascending=False)
            .head(top_k)["vote_pubkey"]
            .tolist()
        )

        ep_perf = perf[perf["epoch"] == ep]
        for label, picks in [("ours", ours), ("random", random_pick), ("baseline", baseline)]:
            sl = ep_perf[ep_perf["vote_pubkey"].isin(picks)]
            out_yield.append({
                "epoch": ep,
                "strategy": label,
                "yield": sl["credits"].mean() if not sl.empty else 0,
            })
            out_inc.append({
                "epoch": ep,
                "strategy": label,
                "incidents": int(((sl["skip_rate"] > 0.05) | sl["delinquent"]).sum()) if not sl.empty else 0,
            })

    return BacktestResult(
        yields=pd.DataFrame(out_yield),
        incidents=pd.DataFrame(out_inc),
    )
