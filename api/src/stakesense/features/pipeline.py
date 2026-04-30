"""Pulls from DB and produces the full feature DataFrame for a given target epoch."""
import pandas as pd
from sqlalchemy import text

from stakesense.db import engine
from stakesense.features.build import build_validator_features
from stakesense.features.static import add_static_features


def load_dataframes() -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    with engine.begin() as conn:
        perf = pd.read_sql(text("SELECT * FROM epoch_performance"), conn)
        validators = pd.read_sql(text("SELECT * FROM validators"), conn)
        mev = pd.read_sql(text("SELECT * FROM mev_observations"), conn)
    return perf, validators, mev


def build_features_for_epoch(target_epoch: int) -> pd.DataFrame:
    perf, validators, mev = load_dataframes()
    rolling = build_validator_features(perf, target_epoch=target_epoch)
    full = add_static_features(rolling, validators, mev)
    return full
