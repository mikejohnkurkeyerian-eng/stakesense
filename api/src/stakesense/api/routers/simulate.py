"""Stake migration simulator — what-if analysis on allocations.

POST /api/v1/simulate
Body: { "before": [{voter_pubkey, sol}, ...], "after": [{voter_pubkey, sol}, ...] }

Returns stake-weighted metrics + concentration for each side, plus deltas
and human-readable insights.
"""
from __future__ import annotations

import re
from dataclasses import asdict
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text

from stakesense.db import engine
from stakesense.scoring.simulate import hydrate_allocations, simulate

router = APIRouter(prefix="/api/v1", tags=["simulate"])

_PK_RE = re.compile(r"^[1-9A-HJ-NP-Za-km-z]{32,44}$")


class _AllocationIn(BaseModel):
    voter_pubkey: str = Field(..., min_length=32, max_length=44)
    sol: float = Field(..., gt=0)


class _SimulateRequest(BaseModel):
    before: list[_AllocationIn] = Field(default_factory=list)
    after: list[_AllocationIn] = Field(default_factory=list)


@router.post("/simulate")
def simulate_endpoint(req: _SimulateRequest) -> dict:
    if not req.before and not req.after:
        raise HTTPException(
            status_code=400,
            detail="Provide at least one allocation in before or after.",
        )
    for r in (*req.before, *req.after):
        if not _PK_RE.match(r.voter_pubkey):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid voter_pubkey: {r.voter_pubkey}",
            )

    voters = sorted(
        {r.voter_pubkey for r in req.before} | {r.voter_pubkey for r in req.after}
    )
    score_rows = _fetch_scores(voters) if voters else {}

    before_positions = hydrate_allocations(
        [{"voter_pubkey": r.voter_pubkey, "sol": r.sol} for r in req.before],
        score_rows,
    )
    after_positions = hydrate_allocations(
        [{"voter_pubkey": r.voter_pubkey, "sol": r.sol} for r in req.after],
        score_rows,
    )

    report = simulate(before_positions, after_positions)
    return asdict(report)


def _fetch_scores(voters: list[str]) -> dict[str, dict[str, Any]]:
    sql = text(
        """
        WITH latest AS (
          SELECT DISTINCT ON (p.vote_pubkey) p.*
            FROM predictions p
           ORDER BY p.vote_pubkey, p.prediction_date DESC
        )
        SELECT v.vote_pubkey, v.name, v.commission_pct,
               v.data_center, v.asn, v.country,
               l.composite_score, l.downtime_prob_7d, l.mev_tax_rate,
               l.decentralization_score
          FROM validators v
          LEFT JOIN latest l ON l.vote_pubkey = v.vote_pubkey
         WHERE v.vote_pubkey = ANY(:voters)
        """
    )
    out: dict[str, dict[str, Any]] = {}
    with engine.begin() as conn:
        for row in conn.execute(sql, {"voters": voters}).mappings().all():
            out[row["vote_pubkey"]] = dict(row)
    return out
