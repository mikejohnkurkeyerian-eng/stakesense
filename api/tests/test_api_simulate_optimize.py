"""Integration tests for POST /api/v1/simulate/optimize."""
from __future__ import annotations

from fastapi.testclient import TestClient

from stakesense.api.main import app

client = TestClient(app)

PK_A = "VotePkAaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
PK_B = "VotePkBbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"


def test_simulate_optimize_rejects_empty_before() -> None:
    r = client.post("/api/v1/simulate/optimize", json={"before": []})
    assert r.status_code == 400


def test_simulate_optimize_rejects_invalid_pubkey() -> None:
    r = client.post(
        "/api/v1/simulate/optimize",
        json={"before": [{"voter_pubkey": "not-a-pubkey", "sol": 100.0}]},
    )
    assert r.status_code in (400, 422)


def test_simulate_optimize_rejects_invalid_objective() -> None:
    r = client.post(
        "/api/v1/simulate/optimize",
        json={
            "before": [{"voter_pubkey": PK_A, "sol": 100.0}],
            "objective": "yield_chasing",
        },
    )
    assert r.status_code == 422


def test_simulate_optimize_returns_after_for_unknown_validator() -> None:
    """Unknown 'before' validator → no improvement candidate, but the response
    still returns a well-formed `after` (mirroring the input)."""
    r = client.post(
        "/api/v1/simulate/optimize",
        json={
            "before": [{"voter_pubkey": PK_A, "sol": 100.0}],
            "objective": "composite",
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert {"moves", "after", "objective", "notes"} <= set(body.keys())
    assert body["objective"] == "composite"
    # The unknown validator either gets swapped to a real top candidate
    # (composite_score better than None comparison) or stays put with notes.
    assert len(body["after"]) == 1
    assert body["after"][0]["sol"] == 100.0


def test_simulate_optimize_caps_max_moves() -> None:
    r = client.post(
        "/api/v1/simulate/optimize",
        json={
            "before": [{"voter_pubkey": PK_A, "sol": 100.0}],
            "objective": "composite",
            "max_moves": 25,  # > 20 cap
        },
    )
    assert r.status_code == 422
