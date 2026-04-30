from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel, Field
from sqlalchemy import text

from stakesense.db import engine


router = APIRouter(prefix="/api/v1", tags=["recommend"])


class RecommendRequest(BaseModel):
    amount_sol: float = Field(..., gt=0)
    risk_profile: Literal["conservative", "balanced", "aggressive"] = "balanced"
    count: int = Field(3, ge=1, le=10)
    exclude_clusters: bool = True


@router.post("/recommend")
def recommend(req: RecommendRequest) -> dict:
    risk_thresholds = {"conservative": 0.10, "balanced": 0.25, "aggressive": 0.50}
    max_downtime = risk_thresholds[req.risk_profile]
    sql = text(
        """
        WITH latest AS (
          SELECT DISTINCT ON (p.vote_pubkey) p.*
            FROM predictions p
           ORDER BY p.vote_pubkey, p.prediction_date DESC
        )
        SELECT v.vote_pubkey, v.name, v.commission_pct, v.data_center, v.country,
               l.composite_score, l.downtime_prob_7d, l.mev_tax_rate, l.decentralization_score
          FROM validators v
          JOIN latest l ON l.vote_pubkey = v.vote_pubkey
         WHERE l.downtime_prob_7d <= :max_downtime
           AND (:exclude_clusters = false
                OR v.data_center NOT IN (SELECT data_center FROM validators
                                          WHERE data_center IS NOT NULL
                                          GROUP BY data_center
                                          HAVING COUNT(*) > 50))
         ORDER BY l.composite_score DESC
         LIMIT :count
        """
    )
    with engine.begin() as conn:
        rows = [
            dict(r._mapping)
            for r in conn.execute(
                sql,
                {
                    "max_downtime": max_downtime,
                    "exclude_clusters": req.exclude_clusters,
                    "count": req.count,
                },
            )
        ]

    for r in rows:
        reasons = []
        if r["downtime_prob_7d"] is not None and r["downtime_prob_7d"] < 0.05:
            reasons.append("low downtime risk")
        if r["mev_tax_rate"] is not None and r["mev_tax_rate"] < 0.05:
            reasons.append("low MEV tax")
        if r["decentralization_score"] is not None and r["decentralization_score"] > 0.7:
            reasons.append("strong decentralization signal")
        r["reasoning"] = " · ".join(reasons) if reasons else "balanced overall score"

    return {"amount_sol": req.amount_sol, "risk_profile": req.risk_profile, "recommendations": rows}
