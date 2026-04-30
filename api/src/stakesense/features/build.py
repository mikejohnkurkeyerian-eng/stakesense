from typing import Any

import numpy as np
import pandas as pd


ROLLING_WINDOW = 5


def _slope(y: np.ndarray) -> float:
    if len(y) < 2:
        return 0.0
    x = np.arange(len(y))
    return float(np.polyfit(x, y, 1)[0])


def _safe_diff(last: Any, mean: Any) -> float | None:
    """Return last - mean, or None if either is null/NaN."""
    if last is None or mean is None:
        return None
    try:
        if pd.isna(last) or pd.isna(mean):
            return None
    except TypeError:
        return None
    return float(last) - float(mean)


def _safe_pct_change(last: Any, first: Any) -> float | None:
    if last is None or first is None:
        return None
    try:
        if pd.isna(last) or pd.isna(first):
            return None
    except TypeError:
        return None
    first = float(first)
    if first == 0:
        return None
    return (float(last) - first) / first


def build_validator_features(
    df: pd.DataFrame,
    *,
    target_epoch: int,
    min_history: int = ROLLING_WINDOW,
) -> pd.DataFrame:
    """Given long-format epoch_performance rows, produce one feature row per validator
    using only data available at or before target_epoch."""
    df = df[df["epoch"] <= target_epoch].copy()
    # Coerce numeric columns so None becomes NaN and arithmetic is safe.
    for col in ("skip_rate", "vote_latency", "credits", "active_stake"):
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")
    out: list[dict[str, Any]] = []

    for vote, g in df.groupby("vote_pubkey"):
        g = g.sort_values("epoch")
        if len(g) < min_history:
            out.append({"vote_pubkey": vote, "insufficient_history": True})
            continue
        recent = g.tail(ROLLING_WINDOW)
        skip_arr = recent["skip_rate"].dropna().to_numpy()
        out.append({
            "vote_pubkey": vote,
            "insufficient_history": False,
            "skip_rate_mean_5e": recent["skip_rate"].mean(),
            "skip_rate_std_5e": recent["skip_rate"].std(ddof=0),
            "skip_rate_trend_5e": _slope(skip_arr) if len(skip_arr) >= 2 else 0.0,
            "vote_latency_mean_5e": recent["vote_latency"].mean(),
            "vote_latency_drift": _safe_diff(
                recent["vote_latency"].iloc[-1], recent["vote_latency"].mean()
            ),
            "credits_mean_5e": recent["credits"].mean(),
            "delinquent_recent": int(recent.tail(3)["delinquent"].fillna(False).any()),
            "active_stake_change_pct_5e": _safe_pct_change(
                recent["active_stake"].iloc[-1], recent["active_stake"].iloc[0]
            ),
            "history_epochs": len(g),
        })

    return pd.DataFrame(out)
