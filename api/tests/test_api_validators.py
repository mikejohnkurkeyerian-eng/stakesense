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


def test_validators_stats_returns_aggregates():
    r = TestClient(app).get("/api/v1/validators/stats")
    assert r.status_code == 200
    body = r.json()
    assert "total_scored" in body
    assert "active_validators" in body
    assert "latest_epoch" in body
    # Numeric fields are float|None — never bool|str.
    for k in ("avg_mev_tax", "avg_downtime_prob", "avg_decentralization", "avg_composite"):
        assert body[k] is None or isinstance(body[k], (int, float))


def test_clusters_endpoint_accepts_axes():
    client = TestClient(app)
    for axis in ("data_center", "asn", "country"):
        r = client.get(f"/api/v1/validators/clusters?by={axis}&top=3")
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["by"] == axis
        assert isinstance(body["clusters"], list)
        assert len(body["clusters"]) <= 3
        if body["clusters"]:
            c = body["clusters"][0]
            assert "cluster" in c and "n_validators" in c


def test_clusters_rejects_invalid_axis():
    r = TestClient(app).get("/api/v1/validators/clusters?by=garbage")
    assert r.status_code == 422  # Literal type rejects unknown values


def test_recommend_smoke():
    r = TestClient(app).post(
        "/api/v1/recommend",
        json={"amount_sol": 100, "risk_profile": "balanced", "count": 3},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["amount_sol"] == 100.0
    assert body["risk_profile"] == "balanced"
    assert isinstance(body["recommendations"], list)
    if body["recommendations"]:
        rec = body["recommendations"][0]
        assert "vote_pubkey" in rec
        assert "reasoning" in rec
