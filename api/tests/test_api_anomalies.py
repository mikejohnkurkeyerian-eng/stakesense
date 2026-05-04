"""Smoke tests for /api/v1/anomalies."""
from __future__ import annotations

from fastapi.testclient import TestClient

from stakesense.api.main import app

client = TestClient(app)


def test_anomalies_returns_detection_list() -> None:
    r = client.get("/api/v1/anomalies")
    assert r.status_code == 200
    body = r.json()
    assert "detections" in body
    assert isinstance(body["detections"], list)


def test_anomalies_respects_limit() -> None:
    r = client.get("/api/v1/anomalies?limit=3")
    assert r.status_code == 200
    detections = r.json()["detections"]
    assert len(detections) <= 3


def test_anomaly_rows_have_expected_shape() -> None:
    r = client.get("/api/v1/anomalies?limit=5")
    body = r.json()
    for d in body["detections"]:
        assert "kind" in d
        assert "vote_pubkey" in d
        assert "summary" in d
        assert "magnitude" in d
        assert d["kind"] in {
            "mev_commission_change",
            "newly_delinquent",
            "composite_drop",
            "composite_climb",
        }


def test_anomalies_rejects_invalid_limit() -> None:
    r = client.get("/api/v1/anomalies?limit=999")  # > max 100
    assert r.status_code == 422
