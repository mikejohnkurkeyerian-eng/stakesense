import pandas as pd

from stakesense.training.targets import compute_downtime_target


def test_downtime_target_flags_high_skip_or_delinquent():
    rows = []
    for e in range(100, 106):
        rows.append({"vote_pubkey": "A", "epoch": e, "skip_rate": 0.02, "delinquent": False})
    for e in range(100, 103):
        rows.append({"vote_pubkey": "B", "epoch": e, "skip_rate": 0.02, "delinquent": False})
    for e in range(103, 106):
        rows.append({"vote_pubkey": "B", "epoch": e, "skip_rate": 0.10, "delinquent": False})
    df = pd.DataFrame(rows)
    targets = compute_downtime_target(df, target_epoch=102, horizon=3, skip_threshold=0.05)
    targets = targets.set_index("vote_pubkey")["downtime"].to_dict()
    assert targets["A"] == 0
    assert targets["B"] == 1
