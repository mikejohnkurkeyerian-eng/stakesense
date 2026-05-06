"""Integration tests for /api/v1/watch — uses the live DB.

These tests insert real rows; they tag the label so cleanup is unambiguous
and run delete-after-create to avoid leaking state. If the
watch_subscriptions table hasn't been migrated yet, tests skip.
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from stakesense.api.main import app
from stakesense.db import engine

client = TestClient(app)
SENTINEL = "TEST_FIXTURE_WATCH_DO_NOT_USE"


def _table_exists() -> bool:
    sql = text(
        """
        SELECT 1 FROM information_schema.tables
         WHERE table_schema='public' AND table_name='watch_subscriptions'
        """
    )
    with engine.begin() as conn:
        return conn.execute(sql).fetchone() is not None


pytestmark = pytest.mark.skipif(
    not _table_exists(),
    reason="watch_subscriptions table not yet migrated; run scripts/migrate.py",
)


def _cleanup() -> None:
    with engine.begin() as conn:
        conn.execute(
            text("DELETE FROM watch_subscriptions WHERE label = :s"),
            {"s": SENTINEL},
        )


def setup_function(_fn) -> None:
    _cleanup()


def teardown_function(_fn) -> None:
    _cleanup()


VALID_PK = "5AC692spnjbegP7ttCXJEzUe8S81sLYsqJd8Ae6Zv1xU"


def test_watch_round_trip_create_list_delete() -> None:
    payload = {
        "vote_pubkey": VALID_PK,
        "webhook_url": "https://example.test/hook",
        "webhook_kind": "discord",
        "metric": "composite_score",
        "comparator": "lt",
        "threshold": 0.7,
        "label": SENTINEL,
    }
    r = client.post("/api/v1/watch", json=payload)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["vote_pubkey"] == VALID_PK
    assert body["metric"] == "composite_score"
    # webhook_url MUST NOT be returned to the public
    assert "webhook_url" not in body
    new_id = body["id"]

    listed = client.get(f"/api/v1/watch?vote_pubkey={VALID_PK}").json()
    ids = [w["id"] for w in listed["results"]]
    assert new_id in ids

    delr = client.delete(f"/api/v1/watch/{new_id}")
    assert delr.status_code == 200
    assert delr.json()["deleted"] == new_id


def test_watch_rejects_invalid_pubkey() -> None:
    r = client.post(
        "/api/v1/watch",
        json={
            "vote_pubkey": "garbage",
            "webhook_url": "https://e.test/hook",
            "metric": "composite_score",
            "comparator": "lt",
            "threshold": 0.5,
        },
    )
    assert r.status_code == 422


def test_watch_rejects_non_http_webhook() -> None:
    r = client.post(
        "/api/v1/watch",
        json={
            "vote_pubkey": VALID_PK,
            "webhook_url": "ftp://e.test/hook",
            "metric": "composite_score",
            "comparator": "lt",
            "threshold": 0.5,
            "label": SENTINEL,
        },
    )
    assert r.status_code == 422


def test_watch_delete_404_for_missing_id() -> None:
    r = client.delete("/api/v1/watch/999999999")
    assert r.status_code == 404


def test_watch_unknown_metric_rejected() -> None:
    r = client.post(
        "/api/v1/watch",
        json={
            "vote_pubkey": VALID_PK,
            "webhook_url": "https://e.test/hook",
            "metric": "magic_number",
            "comparator": "lt",
            "threshold": 0.5,
            "label": SENTINEL,
        },
    )
    assert r.status_code == 422
