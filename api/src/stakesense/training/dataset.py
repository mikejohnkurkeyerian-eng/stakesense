import pandas as pd

from stakesense.features.build import build_validator_features
from stakesense.features.static import add_static_features
from stakesense.training.targets import compute_downtime_target


def build_walk_forward_examples(
    perf: pd.DataFrame,
    validators: pd.DataFrame,
    mev: pd.DataFrame,
    *,
    target_epochs: list[int],
    horizon: int = 3,
    skip_threshold: float = 0.05,
) -> pd.DataFrame:
    out = []
    for ep in target_epochs:
        rolling = build_validator_features(perf, target_epoch=ep)
        feats = add_static_features(rolling, validators, mev)
        targets = compute_downtime_target(
            perf, target_epoch=ep, horizon=horizon, skip_threshold=skip_threshold
        )
        merged = feats.merge(targets, on="vote_pubkey", how="inner")
        merged["target_epoch"] = ep
        out.append(merged)
    return pd.concat(out, ignore_index=True)
