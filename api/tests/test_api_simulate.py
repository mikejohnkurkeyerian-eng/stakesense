"""Integration smoke tests for POST /api/v1/simulate."""
from __future__ import annotations

from fastapi.testclient import TestClient

from stakesense.api.main import app

client = TestClient(app)

# Valid base58 placeholders (32-44 chars, no 0/O/I/l)
PK_A = "VotePkAaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
PK_B = "VotePkBbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"


def test_simulate_rejects_empty_request() -> None:
    r = client.post("/api/v1/simulate", json={"before": [], "after": []})
    assert r.status_code == 400


def test_simulate_rejects_invalid_pubkey() -> None:
    r = client.post(
        "/api/v1/simulate",
        json={
            "before": [{"voter_pubkey": "not-a-pubkey", "sol": 1.0}],
            "after": [],
        },
    )
    assert r.status_code in (400, 422)


def test_simulate_rejects_zero_sol() -> None:
    r = client.post(
        "/api/v1/simulate",
        json={
            "before": [{"voter_pubkey": PK_A, "sol": 0}],
            "after": [],
        },
    )
    assert r.status_code in (400, 422)


def test_simulate_returns_full_schema_for_unknown_validators() -> None:
    """Unknown validators have no scores in DB but the endpoint should still
    return a well-formed response with null metrics."""
    r = client.post(
        "/api/v1/simulate",
        json={
            "before": [{"voter_pubkey": PK_A, "sol": 100.0}],
            "after": [{"voter_pubkey": PK_B, "sol": 100.0}],
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert {"before", "after", "delta"} <= set(body.keys())
    assert body["before"]["total_sol"] == 100.0
    assert body["after"]["total_sol"] == 100.0
    assert "insights" in body["delta"]
