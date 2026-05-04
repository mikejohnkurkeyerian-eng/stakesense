"""Smoke tests for /api/v1/validators/{pk}/rank."""
from __future__ import annotations

from fastapi.testclient import TestClient

from stakesense.api.main import app

client = TestClient(app)


def _top_pubkey() -> str:
    r = client.get("/api/v1/validators?limit=1")
    assert r.status_code == 200
    return r.json()["results"][0]["vote_pubkey"]


def test_rank_returns_full_shape() -> None:
    pk = _top_pubkey()
    r = client.get(f"/api/v1/validators/{pk}/rank")
    assert r.status_code == 200
    body = r.json()
    expected = {
        "vote_pubkey",
        "total_validators",
        "rank_composite",
        "rank_downtime",
        "rank_mev_tax",
        "rank_decentralization",
        "percentile_composite",
        "current_composite",
        "current_downtime_prob",
        "current_mev_tax",
        "current_decentralization",
        "cutoff_top10_composite",
        "cutoff_top50_composite",
        "cutoff_top100_composite",
        "gap_to_top10",
        "gap_to_top50",
    }
    assert expected <= set(body.keys())
    assert body["vote_pubkey"] == pk
    assert body["total_validators"] > 0
    assert 1 <= body["rank_composite"] <= body["total_validators"]


def test_rank_404_for_unknown_pubkey() -> None:
    r = client.get("/api/v1/validators/NotARealValidatorVotePubkey1111111/rank")
    assert r.status_code == 404


def test_top_validator_has_rank_one() -> None:
    pk = _top_pubkey()
    r = client.get(f"/api/v1/validators/{pk}/rank")
    body = r.json()
    # The top validator (sorted by composite_score DESC) should rank #1 on composite
    assert body["rank_composite"] == 1
    assert body["percentile_composite"] is not None
    assert body["percentile_composite"] >= 0.99
