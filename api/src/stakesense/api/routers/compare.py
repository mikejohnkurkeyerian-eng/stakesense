"""Side-by-side validator comparison.

GET /api/v1/compare?vs=A,B,C,D — up to 4 validators in one round-trip.
Used by the /compare web page, the MCP server, and the embeddable widget.
"""
from __future__ import annotations

import re

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import text

from stakesense.db import engine

router = APIRouter(prefix="/api/v1", tags=["compare"])

_PK_RE = re.compile(r"^[1-9A-HJ-NP-Za-km-z]{32,44}$")
MAX_VALIDATORS = 4


@router.get("/compare")
def compare(vs: str = Query(..., description="Comma-separated vote pubkeys, max 4")) -> dict:
    raw = [s.strip() for s in vs.split(",") if s.strip()]
    if not raw:
        raise HTTPException(status_code=400, detail="vs must contain at least one pubkey")
    if len(raw) > MAX_VALIDATORS:
        raise HTTPException(
            status_code=400,
            detail=f"vs accepts at most {MAX_VALIDATORS} pubkeys",
        )
    for pk in raw:
        if not _PK_RE.match(pk):
            raise HTTPException(status_code=400, detail=f"Invalid vote_pubkey: {pk}")

    # Dedupe while preserving order so callers control the column order.
    seen: set[str] = set()
    pks: list[str] = []
    for pk in raw:
        if pk not in seen:
            seen.add(pk)
            pks.append(pk)

    sql = text(
        """
        WITH latest AS (
          SELECT DISTINCT ON (p.vote_pubkey) p.*
            FROM predictions p
           ORDER BY p.vote_pubkey, p.prediction_date DESC
        )
        SELECT v.vote_pubkey, v.name, v.commission_pct, v.active_stake,
               v.data_center, v.country, v.asn,
               l.composite_score, l.downtime_prob_7d, l.mev_tax_rate,
               l.decentralization_score, l.prediction_date
          FROM validators v
          LEFT JOIN latest l ON l.vote_pubkey = v.vote_pubkey
         WHERE v.vote_pubkey = ANY(:pks)
        """
    )
    with engine.begin() as conn:
        rows = {r["vote_pubkey"]: dict(r) for r in conn.execute(sql, {"pks": pks}).mappings().all()}

    results = []
    for pk in pks:
        row = rows.get(pk)
        if row is None:
            results.append({"vote_pubkey": pk, "found": False})
            continue
        if row.get("prediction_date") is not None:
            row["prediction_date"] = str(row["prediction_date"])
        row["found"] = True
        results.append(row)

    return {"results": results, "count": len(results)}
