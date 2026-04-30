from dataclasses import dataclass
from pathlib import Path

import joblib
import lightgbm as lgb
import pandas as pd
from sklearn.metrics import average_precision_score, mean_absolute_error, roc_auc_score


FEATURE_COLS = [
    "skip_rate_mean_5e", "skip_rate_std_5e", "skip_rate_trend_5e",
    "vote_latency_mean_5e", "vote_latency_drift",
    "credits_mean_5e", "delinquent_recent", "active_stake_change_pct_5e",
    "history_epochs",
    "commission_pct", "mev_commission_pct_latest",
    "data_center_concentration", "asn_concentration", "country_concentration",
    "active_stake_percentile",
]


@dataclass
class TrainResult:
    model: lgb.Booster
    auc: float
    ap: float
    feature_importance: dict[str, float]


@dataclass
class RegressionResult:
    model: lgb.Booster
    mae: float
    feature_importance: dict[str, float]


def train_downtime(
    train_df: pd.DataFrame,
    eval_df: pd.DataFrame,
    *,
    n_estimators: int = 500,
) -> TrainResult:
    X_tr = train_df[FEATURE_COLS].fillna(-1)
    y_tr = train_df["downtime"].astype(int)
    X_ev = eval_df[FEATURE_COLS].fillna(-1)
    y_ev = eval_df["downtime"].astype(int)

    dtr = lgb.Dataset(X_tr, y_tr)
    dev = lgb.Dataset(X_ev, y_ev, reference=dtr)

    params = {
        "objective": "binary",
        "metric": "auc",
        "learning_rate": 0.05,
        "num_leaves": 31,
        "feature_fraction": 0.9,
        "bagging_fraction": 0.9,
        "bagging_freq": 5,
        "verbose": -1,
    }
    booster = lgb.train(
        params, dtr, num_boost_round=n_estimators, valid_sets=[dev],
        callbacks=[lgb.early_stopping(50), lgb.log_evaluation(50)],
    )

    proba = booster.predict(X_ev)
    auc = roc_auc_score(y_ev, proba)
    ap = average_precision_score(y_ev, proba)
    fi = dict(zip(FEATURE_COLS, booster.feature_importance(importance_type="gain")))

    return TrainResult(model=booster, auc=float(auc), ap=float(ap), feature_importance=fi)


def train_mev_tax(
    train_df: pd.DataFrame,
    eval_df: pd.DataFrame,
    *,
    target_col: str = "mev_tax_rate",
    n_estimators: int = 500,
) -> RegressionResult:
    X_tr = train_df[FEATURE_COLS].fillna(-1)
    y_tr = train_df[target_col].astype(float)
    X_ev = eval_df[FEATURE_COLS].fillna(-1)
    y_ev = eval_df[target_col].astype(float)

    dtr = lgb.Dataset(X_tr, y_tr)
    dev = lgb.Dataset(X_ev, y_ev, reference=dtr)

    params = {
        "objective": "regression",
        "metric": "mae",
        "learning_rate": 0.05,
        "num_leaves": 31,
        "feature_fraction": 0.9,
        "bagging_fraction": 0.9,
        "bagging_freq": 5,
        "verbose": -1,
    }
    booster = lgb.train(
        params, dtr, num_boost_round=n_estimators, valid_sets=[dev],
        callbacks=[lgb.early_stopping(50), lgb.log_evaluation(50)],
    )

    pred = booster.predict(X_ev)
    mae = mean_absolute_error(y_ev, pred)
    fi = dict(zip(FEATURE_COLS, booster.feature_importance(importance_type="gain")))

    return RegressionResult(model=booster, mae=float(mae), feature_importance=fi)


def save_model(model: lgb.Booster, path: Path, version: str) -> None:
    payload = {"model": model, "feature_cols": FEATURE_COLS, "version": version}
    joblib.dump(payload, path)


def load_model(path: Path) -> dict:
    return joblib.load(path)
