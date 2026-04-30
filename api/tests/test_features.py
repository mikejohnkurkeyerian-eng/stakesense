import pandas as pd

from stakesense.features.build import build_validator_features


def test_rolling_features_compute_correctly():
    epochs = list(range(595, 605))  # 10 epochs ending at 604
    vote = "Vote111"
    rows = [
        {
            "vote_pubkey": vote,
            "epoch": e,
            "skip_rate": 0.05 + 0.01 * i,
            "vote_latency": 1.5,
            "credits": 400_000,
            "active_stake": 1_000_000,
            "delinquent": False,
        }
        for i, e in enumerate(epochs)
    ]
    df = pd.DataFrame(rows)
    features = build_validator_features(df, target_epoch=604)

    assert features.shape[0] == 1
    f = features.iloc[0].to_dict()
    assert f["vote_pubkey"] == vote
    expected_mean = df[df["epoch"].between(600, 604)]["skip_rate"].mean()
    assert abs(f["skip_rate_mean_5e"] - expected_mean) < 1e-9
    assert f["skip_rate_trend_5e"] > 0


def test_insufficient_history_returns_empty_features_or_flag():
    rows = [
        {
            "vote_pubkey": "Vote111",
            "epoch": 600,
            "skip_rate": 0.05,
            "vote_latency": 1.5,
            "credits": 400_000,
            "active_stake": 1_000_000,
            "delinquent": False,
        }
    ]
    df = pd.DataFrame(rows)
    features = build_validator_features(df, target_epoch=600, min_history=10)
    assert features.empty or features.iloc[0]["insufficient_history"]
