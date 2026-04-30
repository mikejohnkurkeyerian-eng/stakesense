import pandas as pd


def compute_decentralization_score(df: pd.DataFrame) -> pd.DataFrame:
    """Higher = more decentralization-positive. Range [0, 1]."""
    out = df[["vote_pubkey"]].copy()
    for col in ("data_center", "asn", "country"):
        cnt = df.groupby(col)["vote_pubkey"].transform("count").fillna(1).astype(float)
        out[f"{col}_score"] = 1.0 - (cnt.rank(pct=True))
    if "active_stake" in df.columns:
        top30 = df["active_stake"].rank(ascending=False) <= 30
        out["superminority_penalty"] = top30.map({True: 0.0, False: 1.0})
    else:
        out["superminority_penalty"] = 1.0

    score_cols = ["data_center_score", "asn_score", "country_score", "superminority_penalty"]
    out["decentralization_score"] = out[score_cols].mean(axis=1)
    return out[["vote_pubkey", "decentralization_score"]]
