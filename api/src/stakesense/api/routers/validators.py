from typing import Literal

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import text

from stakesense.db import engine

router = APIRouter(prefix="/api/v1/validators", tags=["validators"])

# Primary sort + tie-breakers. Tie-breakers favor lower commission and validators
# outside the top of the stake distribution (decentralization-positive). Without
# this, many validators tie on identical pillar scores and the table looks flat
# until validators.app metadata fills in.
SORT_CLAUSE = {
    "composite": (
        "composite_score DESC NULLS LAST, "
        "v.commission_pct ASC NULLS LAST, "
        "v.active_stake ASC NULLS LAST"
    ),
    "downtime": (
        "downtime_prob_7d ASC NULLS LAST, "
        "composite_score DESC NULLS LAST, "
        "v.commission_pct ASC NULLS LAST"
    ),
    "mev_tax": (
        "mev_tax_rate ASC NULLS LAST, "
        "v.commission_pct ASC NULLS LAST, "
        "composite_score DESC NULLS LAST"
    ),
    "decentralization": (
        "decentralization_score DESC NULLS LAST, "
        "v.active_stake ASC NULLS LAST, "
        "composite_score DESC NULLS LAST"
    ),
}


@router.get("")
def list_validators(
    sort: Literal["composite", "downtime", "mev_tax", "decentralization"] = "composite",
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> dict:
    sort_clause = SORT_CLAUSE[sort]
    sql = text(
        f"""
        WITH latest AS (
          SELECT DISTINCT ON (p.vote_pubkey) p.*
            FROM predictions p
           ORDER BY p.vote_pubkey, p.prediction_date DESC
        )
        SELECT v.vote_pubkey, v.name, v.commission_pct, v.active_stake,
               v.data_center, v.country,
               l.composite_score, l.downtime_prob_7d, l.mev_tax_rate,
               l.decentralization_score
          FROM validators v
          JOIN latest l ON l.vote_pubkey = v.vote_pubkey
         ORDER BY {sort_clause}
         LIMIT :limit OFFSET :offset
        """
    )
    count_sql = text(
        "SELECT COUNT(*) FROM predictions "
        "WHERE prediction_date = (SELECT MAX(prediction_date) FROM predictions)"
    )
    with engine.begin() as conn:
        total = conn.execute(count_sql).scalar() or 0
        rows = [dict(r._mapping) for r in conn.execute(sql, {"limit": limit, "offset": offset})]
    return {"results": rows, "total": total, "limit": limit, "offset": offset}


@router.get("/stats")
def stats() -> dict:
    sql = text(
        """
        WITH latest AS (
          SELECT DISTINCT ON (vote_pubkey) * FROM predictions
           ORDER BY vote_pubkey, prediction_date DESC
        )
        SELECT
          AVG(mev_tax_rate)               AS avg_mev_tax,
          AVG(downtime_prob_7d)           AS avg_downtime_prob,
          AVG(decentralization_score)     AS avg_decentralization,
          AVG(composite_score)            AS avg_composite,
          COUNT(*)                        AS total_scored,
          (SELECT COUNT(*) FROM validators WHERE active_stake > 0) AS active_validators,
          (SELECT MAX(epoch) FROM epoch_performance)               AS latest_epoch,
          (SELECT MAX(prediction_date) FROM predictions)           AS latest_prediction_date
          FROM latest
        """
    )
    with engine.begin() as conn:
        row = conn.execute(sql).mappings().one()
    return {
        "avg_mev_tax": float(row["avg_mev_tax"]) if row["avg_mev_tax"] is not None else None,
        "avg_downtime_prob": float(row["avg_downtime_prob"]) if row["avg_downtime_prob"] is not None else None,
        "avg_decentralization": float(row["avg_decentralization"]) if row["avg_decentralization"] is not None else None,
        "avg_composite": float(row["avg_composite"]) if row["avg_composite"] is not None else None,
        "total_scored": int(row["total_scored"]),
        "active_validators": int(row["active_validators"]),
        "latest_epoch": int(row["latest_epoch"]) if row["latest_epoch"] is not None else None,
        "latest_prediction_date": str(row["latest_prediction_date"]) if row["latest_prediction_date"] else None,
    }


@router.get("/{vote_pubkey}")
def get_validator(vote_pubkey: str) -> dict:
    sql = text(
        """
        SELECT v.*, p.composite_score, p.downtime_prob_7d, p.mev_tax_rate,
               p.decentralization_score, p.prediction_date, p.model_version
          FROM validators v
     LEFT JOIN predictions p ON p.vote_pubkey = v.vote_pubkey
                            AND p.prediction_date = (SELECT MAX(prediction_date) FROM predictions)
         WHERE v.vote_pubkey = :pk
        """
    )
    history_sql = text(
        """
        SELECT epoch, skip_rate, vote_latency, credits, active_stake, delinquent
          FROM epoch_performance
         WHERE vote_pubkey = :pk
         ORDER BY epoch DESC
         LIMIT 90
        """
    )
    with engine.begin() as conn:
        row = conn.execute(sql, {"pk": vote_pubkey}).mappings().fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="not found")
        history = [dict(r._mapping) for r in conn.execute(history_sql, {"pk": vote_pubkey})]
    return {"validator": dict(row), "history": history}
