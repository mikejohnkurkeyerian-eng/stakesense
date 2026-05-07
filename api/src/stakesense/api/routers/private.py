"""Confidential staking queries — Arcium roadmap stub.

Right now this returns the same recommendations as POST /api/v1/recommend,
plus a header indicating that the response *would* be the output of an
Arcium MPC computation in the production version. The point: stakers
querying "what should I delegate?" leak both their stake size and risk
preference today. Routing the same question through Arcium would let
them ask without revealing inputs to anyone — including stakesense.

This stub is intentionally simple. It exists so judges can see the
intended integration shape and so the Arcium sponsor bounty draft has a
demonstrable surface to point at.
"""
from __future__ import annotations

from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel, Field
from sqlalchemy import text

from stakesense.db import engine

router = APIRouter(prefix="/api/v1/private", tags=["private (arcium-roadmap)"])


class _PrivateRecommendRequest(BaseModel):
    amount_sol: float = Field(..., gt=0, le=1_000_000_000)
    risk_profile: Literal["conservative", "balanced", "aggressive"] = "balanced"
    count: int = Field(3, ge=1, le=20)


@router.post("/recommend")
def private_recommend(req: _PrivateRecommendRequest) -> dict:
    """Roadmap stub. Returns the same picks as /api/v1/recommend along with
    a `confidentiality` envelope describing what would be private under the
    Arcium-backed production version.

    See `/sponsors/arcium` (or the Arcium bounty doc) for the full design."""
    weights = _weights_for(req.risk_profile)
    sql = text(
        """
        WITH latest AS (
          SELECT DISTINCT ON (p.vote_pubkey) p.*
            FROM predictions p
           ORDER BY p.vote_pubkey, p.prediction_date DESC
        )
        SELECT v.vote_pubkey, v.name, v.commission_pct,
               l.composite_score, l.downtime_prob_7d, l.mev_tax_rate,
               l.decentralization_score
          FROM validators v
          JOIN latest l ON l.vote_pubkey = v.vote_pubkey
         WHERE l.composite_score IS NOT NULL
         ORDER BY (
                   :w_d * (1 - COALESCE(l.downtime_prob_7d, 0))
                 + :w_m * (1 - COALESCE(l.mev_tax_rate, 0))
                 + :w_c * COALESCE(l.decentralization_score, 0)
                 ) DESC
         LIMIT :count
        """
    )
    with engine.begin() as conn:
        rows = [
            dict(r) for r in conn.execute(
                sql,
                {
                    "w_d": weights["downtime"],
                    "w_m": weights["mev"],
                    "w_c": weights["decentralization"],
                    "count": req.count,
                },
            ).mappings()
        ]
    return {
        "recommendations": rows,
        "confidentiality": {
            "status": "stub",
            "today": (
                "amount_sol and risk_profile are sent in cleartext to stakesense "
                "and logged at the rate-limiter."
            ),
            "production_target": (
                "amount_sol and risk_profile encrypted with Arcium MPC keys; "
                "ranking executed inside a Mixed-MXE program; only the top-K "
                "voter pubkeys leave the computation."
            ),
            "tracking_issue": "https://github.com/mikejohnkurkeyerian-eng/stakesense/issues",
        },
        "echo": {
            "amount_sol": req.amount_sol,
            "risk_profile": req.risk_profile,
            "count": req.count,
        },
    }


def _weights_for(profile: str) -> dict[str, float]:
    if profile == "conservative":
        return {"downtime": 0.7, "mev": 0.2, "decentralization": 0.1}
    if profile == "aggressive":
        return {"downtime": 0.3, "mev": 0.2, "decentralization": 0.5}
    return {"downtime": 0.5, "mev": 0.3, "decentralization": 0.2}
