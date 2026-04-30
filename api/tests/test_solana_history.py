from stakesense.sources.solana_history import (
    epoch_credit_rows_from_vote_accounts,
    merge_epoch_rows,
    skip_rate_rows_for_current_epoch,
)


def test_epoch_credit_rows_compute_per_epoch_delta():
    records = [
        {
            "vote_pubkey": "VoteA",
            "epoch_credits": [
                [960, 1000, 800],
                [961, 1300, 1000],
                [962, 1500, 1300],
            ],
        }
    ]
    rows = epoch_credit_rows_from_vote_accounts(records)
    assert len(rows) == 3
    by_epoch = {r["epoch"]: r["credits"] for r in rows}
    assert by_epoch[960] == 200
    assert by_epoch[961] == 300
    assert by_epoch[962] == 200


def test_skip_rate_rows_compute_correctly():
    by_identity = {
        "id1": [100, 95],   # 5% skip
        "id2": [200, 200],  # 0% skip
        "id3": [50, 0],     # 100% skip
        "idUnknown": [10, 10],  # not in map → skipped
    }
    identity_to_vote = {"id1": "VoteA", "id2": "VoteB", "id3": "VoteC"}
    rows = skip_rate_rows_for_current_epoch(by_identity, identity_to_vote, current_epoch=964)
    assert len(rows) == 3
    by_vote = {r["vote_pubkey"]: r for r in rows}
    assert abs(by_vote["VoteA"]["skip_rate"] - 0.05) < 1e-9
    assert by_vote["VoteB"]["skip_rate"] == 0.0
    assert by_vote["VoteC"]["skip_rate"] == 1.0


def test_merge_overlays_non_none():
    a = [{"vote_pubkey": "V", "epoch": 1, "credits": 100, "skip_rate": None}]
    b = [{"vote_pubkey": "V", "epoch": 1, "credits": None, "skip_rate": 0.05}]
    merged = merge_epoch_rows(a, b)
    assert len(merged) == 1
    r = merged[0]
    assert r["credits"] == 100
    assert r["skip_rate"] == 0.05
