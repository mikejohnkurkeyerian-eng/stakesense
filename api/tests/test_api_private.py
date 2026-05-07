"""Tests for the Arcium-roadmap stub (POST /api/v1/private/recommend)."""
from __future__ import annotations

from fastapi.testclient import TestClient

from stakesense.api.main import app

client = TestClient(app)


def test_private_recommend_smoke() -> None:
    r = client.post(
        "/api/v1/private/recommend",
        json={"amount_sol": 100.0, "risk_profile": "balanced", "count": 3},
    )
    assert r.status_code == 200
    body = r.json()
    assert "recommendations" in body
    assert "confidentiality" in body
    assert body["confidentiality"]["status"] == "stub"
    # Echo round-trips so callers can verify request shape
    assert body["echo"]["amount_sol"] == 100.0
    assert body["echo"]["risk_profile"] == "balanced"


def test_private_recommend_rejects_invalid_profile() -> None:
    r = client.post(
        "/api/v1/private/recommend",
        json={"amount_sol": 1.0, "risk_profile": "yolo"},
    )
    assert r.status_code == 422


def test_private_recommend_rejects_zero_sol() -> None:
    r = client.post(
        "/api/v1/private/recommend",
        json={"amount_sol": 0, "risk_profile": "balanced"},
    )
    assert r.status_code == 422
