import pandas as pd


def add_static_features(
    perf: pd.DataFrame,
    validators: pd.DataFrame,
    mev: pd.DataFrame,
) -> pd.DataFrame:
    """Merge static / current features (commission, MEV, geo) onto the rolling-feature frame."""
    df = perf.merge(
        validators[
            ["vote_pubkey", "commission_pct", "data_center", "asn", "country", "active_stake"]
        ],
        on="vote_pubkey",
        how="left",
    )

    if not mev.empty:
        latest_mev = (
            mev.sort_values("epoch")
            .drop_duplicates("vote_pubkey", keep="last")
            .rename(columns={"mev_commission_pct": "mev_commission_pct_latest"})[
                ["vote_pubkey", "mev_commission_pct_latest"]
            ]
        )
        df = df.merge(latest_mev, on="vote_pubkey", how="left")
    else:
        df["mev_commission_pct_latest"] = None

    for col in ("data_center", "asn", "country"):
        cnt = df.groupby(col)["vote_pubkey"].transform("count")
        df[f"{col}_concentration"] = cnt

    df["active_stake_percentile"] = df["active_stake"].rank(pct=True)

    return df
