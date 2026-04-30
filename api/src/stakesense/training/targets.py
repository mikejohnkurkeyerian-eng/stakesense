import pandas as pd


def compute_downtime_target(
    df: pd.DataFrame,
    *,
    target_epoch: int,
    horizon: int = 3,
    skip_threshold: float = 0.05,
) -> pd.DataFrame:
    """Binary: 1 if any of the next `horizon` epochs has skip_rate > threshold OR delinquent=True."""
    fut = df[(df["epoch"] > target_epoch) & (df["epoch"] <= target_epoch + horizon)]
    flagged = (
        fut.assign(bad=(fut["skip_rate"] > skip_threshold) | (fut["delinquent"]))
        .groupby("vote_pubkey")["bad"]
        .any()
        .astype(int)
        .rename("downtime")
        .reset_index()
    )
    return flagged


def compute_mev_tax_target(
    perf: pd.DataFrame,
    mev: pd.DataFrame,
    *,
    target_epoch: int,
    horizon: int = 3,
) -> pd.DataFrame:
    """Continuous target: avg mev_commission_pct (as fraction) in the future window.
    For validators with no Jito presence, treat as MEV-not-captured (set to a fixed
    'opportunity-cost' floor)."""
    fut_mev = mev[(mev["epoch"] > target_epoch) & (mev["epoch"] <= target_epoch + horizon)]
    avg = fut_mev.groupby("vote_pubkey")["mev_commission_pct"].mean() / 100.0
    out = avg.rename("mev_tax_rate").reset_index()
    return out
