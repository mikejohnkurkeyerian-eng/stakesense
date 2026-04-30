from fastapi.testclient import TestClient

from stakesense.api.main import app


def test_list_validators_returns_paginated_results():
    r = TestClient(app).get("/api/v1/validators?limit=5")
    assert r.status_code == 200
    body = r.json()
    assert "results" in body
    assert "total" in body
    assert len(body["results"]) <= 5
    if body["results"]:
        v = body["results"][0]
        assert {
            "vote_pubkey",
            "composite_score",
            "downtime_prob_7d",
            "mev_tax_rate",
            "decentralization_score",
        } <= set(v.keys())
