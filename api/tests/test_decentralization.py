import pandas as pd

from stakesense.scoring.decentralization import compute_decentralization_score


def test_concentration_penalizes_clusters():
    df = pd.DataFrame([
        {"vote_pubkey": "A", "data_center": "DC1", "asn": "1", "country": "US", "active_stake": 1_000_000},
        {"vote_pubkey": "B", "data_center": "DC1", "asn": "1", "country": "US", "active_stake": 1_000_000},
        {"vote_pubkey": "C", "data_center": "DC2", "asn": "2", "country": "DE", "active_stake": 1_000_000},
    ])
    out = compute_decentralization_score(df)
    s = out.set_index("vote_pubkey")["decentralization_score"]
    assert s["C"] > s["A"]
    assert s["C"] > s["B"]
