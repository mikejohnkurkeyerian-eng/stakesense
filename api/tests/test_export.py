"""Smoke tests for /api/v1/export/* (open-data CC-BY exports)."""
from __future__ import annotations

from fastapi.testclient import TestClient

from stakesense.api.main import app

client = TestClient(app)


def test_manifest_lists_all_exports() -> None:
    r = client.get("/api/v1/export/manifest.json")
    assert r.status_code == 200
    body = r.json()
    assert body["license"] == "CC-BY 4.0"
    ids = {e["id"] for e in body["exports"]}
    assert {"predictions", "validators", "decentralization"} <= ids


def test_predictions_csv_has_attribution_header() -> None:
    r = client.get("/api/v1/export/predictions.csv")
    assert r.status_code == 200
    body = r.text
    assert "CC-BY 4.0" in body
    assert "stakesense" in body
    # CSV header line with key columns
    assert "vote_pubkey" in body
    assert "composite_score" in body


def test_predictions_json_includes_license() -> None:
    r = client.get("/api/v1/export/predictions.json")
    assert r.status_code == 200
    body = r.json()
    assert body["license"] == "CC-BY 4.0"
    assert body["row_count"] >= 0
    assert isinstance(body["rows"], list)


def test_validators_csv_returns_attachment() -> None:
    r = client.get("/api/v1/export/validators.csv")
    assert r.status_code == 200
    cd = r.headers.get("content-disposition", "")
    assert "stakesense-validators.csv" in cd


def test_decentralization_json_has_clusters() -> None:
    r = client.get("/api/v1/export/decentralization.json")
    assert r.status_code == 200
    body = r.json()
    assert "nakamoto_coefficient" in body
    assert {"data_center", "asn", "country"} <= set(body["clusters"].keys())
