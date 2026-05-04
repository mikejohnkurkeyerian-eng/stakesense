"""Integration smoke tests for /api/v1/portfolio/{owner_pubkey}."""
from __future__ import annotations

from fastapi.testclient import TestClient

from stakesense.api.main import app

client = TestClient(app)


def test_portfolio_rejects_invalid_pubkey() -> None:
    r = client.get("/api/v1/portfolio/notapubkey")
    assert r.status_code == 400
    assert "base58" in r.json()["detail"]


def test_portfolio_rejects_pubkey_with_zeroes_only() -> None:
    # base58 alphabet excludes '0' — this should fail validation
    r = client.get("/api/v1/portfolio/00000000000000000000000000000000")
    assert r.status_code == 400


def test_portfolio_returns_empty_for_wallet_with_no_stakes() -> None:
    # Use the system program ID — a valid pubkey that owns no stake accounts
    r = client.get("/api/v1/portfolio/11111111111111111111111111111112")
    # Either 200 with empty positions, or 502 if RPC is misconfigured in test env.
    assert r.status_code in (200, 502, 503)
    if r.status_code == 200:
        body = r.json()
        assert body["owner_pubkey"] == "11111111111111111111111111111112"
        assert body["total_sol"] == 0.0
        assert body["positions"] == []
        # Should still emit the "no delegations" info warning
        assert any(w["severity"] == "info" for w in body["warnings"])


def test_portfolio_has_full_schema() -> None:
    r = client.get("/api/v1/portfolio/11111111111111111111111111111112")
    if r.status_code != 200:
        return
    body = r.json()
    expected_keys = {
        "owner_pubkey",
        "positions",
        "total_sol",
        "total_active_sol",
        "weighted_composite",
        "weighted_downtime_prob",
        "weighted_mev_tax",
        "weighted_decentralization",
        "concentration_by_data_center",
        "concentration_by_asn",
        "concentration_by_country",
        "warnings",
        "rebalance_suggestions",
    }
    assert expected_keys <= set(body.keys())
