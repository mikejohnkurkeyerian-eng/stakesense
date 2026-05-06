"""Public registry for validator watch subscriptions.

Anyone can register a watch — vote_pubkey + webhook_url + threshold.
A separate cron script (`scripts/dispatch_watch_alerts.py`) reads this
table after each data refresh and posts to triggered webhooks.

This is intentionally simple: no auth, no rate-limit beyond the global
rate-limiter. Spam mitigation lives in the dispatcher (which de-duplicates
by `last_fired_at`) and at the upstream webhook (Discord/Slack).
"""
from __future__ import annotations

import re
from typing import Literal

from fastapi import APIRouter, HTTPException, Path
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import text

from stakesense.db import engine

router = APIRouter(prefix="/api/v1/watch", tags=["watch"])

_PK_RE = re.compile(r"^[1-9A-HJ-NP-Za-km-z]{32,44}$")
_ALLOWED_METRICS = {
    "composite_score",
    "downtime_prob_7d",
    "mev_tax_rate",
    "decentralization_score",
}


class _WatchIn(BaseModel):
    vote_pubkey: str = Field(..., min_length=32, max_length=44)
    webhook_url: str = Field(..., min_length=8, max_length=512)
    webhook_kind: Literal["discord", "slack", "generic"] = "discord"
    metric: Literal[
        "composite_score",
        "downtime_prob_7d",
        "mev_tax_rate",
        "decentralization_score",
    ] = "composite_score"
    comparator: Literal["lt", "gt"] = "lt"
    threshold: float = Field(..., ge=-1.0, le=1.0)
    label: str | None = Field(None, max_length=80)

    @field_validator("vote_pubkey")
    @classmethod
    def _pubkey_format(cls, v: str) -> str:
        if not _PK_RE.match(v):
            raise ValueError("vote_pubkey must be base58, 32-44 chars")
        return v

    @field_validator("webhook_url")
    @classmethod
    def _webhook_format(cls, v: str) -> str:
        if not (v.startswith("https://") or v.startswith("http://")):
            raise ValueError("webhook_url must start with http(s)://")
        return v


@router.post("")
def create_watch(req: _WatchIn) -> dict:
    sql = text(
        """
        INSERT INTO watch_subscriptions
            (vote_pubkey, webhook_url, webhook_kind, metric, comparator, threshold, label)
        VALUES
            (:vote_pubkey, :webhook_url, :webhook_kind, :metric, :comparator, :threshold, :label)
        RETURNING id, vote_pubkey, webhook_kind, metric, comparator, threshold, label, created_at
        """
    )
    with engine.begin() as conn:
        row = conn.execute(sql, req.model_dump()).mappings().fetchone()
    if row is None:
        raise HTTPException(status_code=500, detail="Insert failed")
    return _serialize(dict(row))


@router.get("")
def list_watches(vote_pubkey: str | None = None, limit: int = 50) -> dict:
    """List watches; optional filter by vote_pubkey. Webhook URLs redacted."""
    if vote_pubkey is not None and not _PK_RE.match(vote_pubkey):
        raise HTTPException(status_code=400, detail="Invalid vote_pubkey")
    sql = text(
        """
        SELECT id, vote_pubkey, webhook_kind, metric, comparator, threshold, label,
               created_at, last_fired_at
          FROM watch_subscriptions
         WHERE (:vote_pubkey IS NULL OR vote_pubkey = :vote_pubkey)
         ORDER BY created_at DESC
         LIMIT :limit
        """
    )
    with engine.begin() as conn:
        rows = [
            dict(r)
            for r in conn.execute(
                sql, {"vote_pubkey": vote_pubkey, "limit": min(max(1, limit), 200)}
            ).mappings()
        ]
    return {"results": [_serialize(r) for r in rows], "n": len(rows)}


@router.delete("/{watch_id}")
def delete_watch(watch_id: int = Path(..., ge=1)) -> dict:
    sql = text("DELETE FROM watch_subscriptions WHERE id = :id RETURNING id")
    with engine.begin() as conn:
        row = conn.execute(sql, {"id": watch_id}).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Watch not found")
    return {"deleted": int(row[0])}


def _serialize(row: dict) -> dict:
    """Public watch row — never includes webhook_url."""
    return {
        "id": int(row["id"]),
        "vote_pubkey": row["vote_pubkey"],
        "webhook_kind": row.get("webhook_kind"),
        "metric": row.get("metric"),
        "comparator": row.get("comparator"),
        "threshold": row.get("threshold"),
        "label": row.get("label"),
        "created_at": row["created_at"].isoformat() if row.get("created_at") else None,
        "last_fired_at": (
            row["last_fired_at"].isoformat() if row.get("last_fired_at") else None
        ),
    }
