"""Stake migration simulator — what-if analysis on allocations.

POST /api/v1/simulate
Body: { "before": [{voter_pubkey, sol}, ...], "after": [{voter_pubkey, sol}, ...] }

Returns stake-weighted metrics + concentration for each side, plus deltas
and human-readable insights.

POST /api/v1/simulate/optimize
Body: { "before": [...], "objective": "composite" | "downtime" | "decentralization" }

Returns the suggested moves + the resulting `after` allocation, ready to
drop into the simulator's After column.
"""
from __future__ import annotations

import re
from dataclasses import asdict
from typing import Any, Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text

from stakesense.db import engine
from stakesense.scoring.optimize import optimize as run_optimize
from stakesense.scoring.simulate import hydrate_allocations, simulate

router = APIRouter(prefix="/api/v1", tags=["simulate"])

_PK_RE = re.compile(r"^[1-9A-HJ-NP-Za-km-z]{32,44}$")


class _AllocationIn(BaseModel):
    voter_pubkey: str = Field(..., min_length=32, max_length=44)
    sol: float = Field(..., gt=0)


class _SimulateRequest(BaseModel):
    before: list[_AllocationIn] = Field(default_factory=list)
    after: list[_AllocationIn] = Field(default_factory=list)


class _OptimizeRequest(BaseModel):
    before: list[_AllocationIn] = Field(default_factory=list)
    objective: Literal["composite", "downtime", "decentralization"] = "composite"
    max_moves: int = Field(5, ge=1, le=20)


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


@router.post("/simulate/optimize")
def simulate_optimize(req: _OptimizeRequest) -> dict:
    """Find the best 'after' allocation for the given 'before' + objective.

    Reuses the portfolio optimizer but accepts hypothetical allocations
    (no on-chain stake account lookup). Returns the moves plus a ready-to-use
    `after` array the UI can drop straight into the simulator.
    """
    if not req.before:
        raise HTTPException(
            status_code=400,
            detail="Provide at least one allocation in `before`.",
        )
    for r in req.before:
        if not _PK_RE.match(r.voter_pubkey):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid voter_pubkey: {r.voter_pubkey}",
            )

    voters = sorted({r.voter_pubkey for r in req.before})
    score_rows = _fetch_scores(voters)

    positions: list[dict[str, Any]] = []
    for r in req.before:
        info = score_rows.get(r.voter_pubkey, {})
        positions.append(
            {
                "voter_pubkey": r.voter_pubkey,
                "sol": r.sol,
                "name": info.get("name"),
                "composite_score": info.get("composite_score"),
                "downtime_prob_7d": info.get("downtime_prob_7d"),
                "decentralization_score": info.get("decentralization_score"),
                "data_center": info.get("data_center"),
            }
        )

    candidates = _fetch_top_candidates(limit=80)
    result = run_optimize(
        positions,
        candidates,
        objective=req.objective,
        max_moves=req.max_moves,
    )

    # Build the resulting "after" allocation: positions not moved keep their
    # existing voter; moved positions point at the suggested target with the
    # original SOL amount preserved.
    move_lookup = {m.from_voter_pubkey: m for m in result.moves}
    after: list[dict[str, Any]] = []
    for r in req.before:
        mv = move_lookup.get(r.voter_pubkey)
        if mv is None:
            after.append({"voter_pubkey": r.voter_pubkey, "sol": r.sol})
        else:
            after.append({"voter_pubkey": mv.to_voter_pubkey, "sol": r.sol})

    return {
        "objective": req.objective,
        "moves": [asdict(m) for m in result.moves],
        "objective_before": result.objective_before,
        "objective_after": result.objective_after,
        "total_sol_moved": result.total_sol_moved,
        "notes": result.notes,
        "after": after,
    }


def _fetch_top_candidates(limit: int = 80) -> list[dict[str, Any]]:
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
          JOIN latest l ON l.vote_pubkey = v.vote_pubkey
         WHERE l.composite_score IS NOT NULL
         ORDER BY l.composite_score DESC NULLS LAST,
                  v.commission_pct ASC NULLS LAST
         LIMIT :limit
        """
    )
    with engine.begin() as conn:
        return [dict(r) for r in conn.execute(sql, {"limit": limit}).mappings().all()]


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
