"""Integration tests for GET /api/v1/compare."""
from __future__ import annotations

from fastapi.testclient import TestClient

from stakesense.api.main import app

client = TestClient(app)

PK_A = "VotePkAaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
PK_B = "VotePkBbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"


def test_compare_requires_vs() -> None:
    r = client.get("/api/v1/compare")
    assert r.status_code == 422


def test_compare_rejects_empty_string() -> None:
    r = client.get("/api/v1/compare?vs=")
    assert r.status_code == 400


def test_compare_rejects_invalid_pubkey() -> None:
    r = client.get("/api/v1/compare?vs=not-a-pubkey")
    assert r.status_code == 400


def test_compare_rejects_too_many() -> None:
    pks = ",".join([PK_A, PK_B, PK_A.replace("A", "C"), PK_A.replace("A", "D"), PK_A.replace("A", "E")])
    r = client.get(f"/api/v1/compare?vs={pks}")
    assert r.status_code == 400


def test_compare_returns_not_found_marker_for_unknown() -> None:
    r = client.get(f"/api/v1/compare?vs={PK_A},{PK_B}")
    assert r.status_code == 200
    body = r.json()
    assert body["count"] == 2
    assert all(not row["found"] for row in body["results"])
    assert [row["vote_pubkey"] for row in body["results"]] == [PK_A, PK_B]


def test_compare_dedupes_repeated_pubkeys() -> None:
    r = client.get(f"/api/v1/compare?vs={PK_A},{PK_A},{PK_A}")
    assert r.status_code == 200
    body = r.json()
    assert body["count"] == 1
