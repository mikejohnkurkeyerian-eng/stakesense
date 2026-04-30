import pandas as pd

from stakesense.training.dataset import build_walk_forward_examples


def test_walk_forward_yields_expected_shapes():
    perf_rows = []
    for vote in ["A", "B"]:
        for e in range(50, 80):
            perf_rows.append({
                "vote_pubkey": vote,
                "epoch": e,
                "skip_rate": 0.02 + (0.01 if vote == "B" and e >= 70 else 0.0),
                "vote_latency": 1.5,
                "credits": 400_000,
                "active_stake": 1_000_000,
                "delinquent": False,
            })
    perf = pd.DataFrame(perf_rows)
    val = pd.DataFrame([
        {"vote_pubkey": v, "commission_pct": 5, "data_center": "x",
         "asn": "1", "country": "US", "active_stake": 1_000_000}
        for v in ["A", "B"]
    ])
    mev = pd.DataFrame(columns=[
        "vote_pubkey", "epoch", "mev_revenue_lamports",
        "mev_commission_pct", "mev_to_delegators_lamports",
    ])

    examples = build_walk_forward_examples(perf, val, mev, target_epochs=[60, 65, 70])
    assert "downtime" in examples.columns
    assert "skip_rate_mean_5e" in examples.columns
    assert examples["target_epoch"].nunique() == 3
