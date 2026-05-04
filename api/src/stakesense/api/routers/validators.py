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
    # Nakamoto coefficient: minimum number of top-stake validators whose combined
    # stake exceeds 1/3 of total stake. Lower = more centralized; higher is better
    # for Solana's halt-resistance.
    nakamoto_sql = text(
        """
        WITH ordered AS (
          SELECT active_stake, ROW_NUMBER() OVER (ORDER BY active_stake DESC) AS rk,
                 SUM(active_stake) OVER (ORDER BY active_stake DESC) AS running_total,
                 SUM(active_stake) OVER () AS total
            FROM validators
           WHERE active_stake IS NOT NULL AND active_stake > 0
        )
        SELECT MIN(rk) AS nakamoto_coefficient
          FROM ordered
         WHERE running_total > total / 3
        """
    )
    with engine.begin() as conn:
        row = conn.execute(sql).mappings().one()
        nk = conn.execute(nakamoto_sql).scalar()
    return {
        "avg_mev_tax": float(row["avg_mev_tax"]) if row["avg_mev_tax"] is not None else None,
        "avg_downtime_prob": float(row["avg_downtime_prob"]) if row["avg_downtime_prob"] is not None else None,
        "avg_decentralization": float(row["avg_decentralization"]) if row["avg_decentralization"] is not None else None,
        "avg_composite": float(row["avg_composite"]) if row["avg_composite"] is not None else None,
        "total_scored": int(row["total_scored"]),
        "active_validators": int(row["active_validators"]),
        "latest_epoch": int(row["latest_epoch"]) if row["latest_epoch"] is not None else None,
        "latest_prediction_date": str(row["latest_prediction_date"]) if row["latest_prediction_date"] else None,
        "nakamoto_coefficient": int(nk) if nk is not None else None,
    }


@router.get("/clusters")
def clusters(
    by: Literal["data_center", "asn", "country"] = "data_center",
    top: int = Query(15, ge=1, le=50),
) -> dict:
    sql = text(
        f"""
        SELECT COALESCE({by}, '(unknown)') AS cluster,
               COUNT(*)                   AS n_validators,
               SUM(active_stake)          AS total_stake
          FROM validators
         WHERE active_stake > 0
         GROUP BY {by}
         ORDER BY n_validators DESC
         LIMIT :top
        """
    )
    with engine.begin() as conn:
        rows = [dict(r._mapping) for r in conn.execute(sql, {"top": top})]
    for r in rows:
        if r.get("total_stake") is not None:
            r["total_stake"] = int(r["total_stake"])
    return {"by": by, "clusters": rows}


@router.get("/{vote_pubkey}/predictions")
def predictions_history(vote_pubkey: str, limit: int = Query(30, ge=1, le=180)) -> dict:
    sql = text(
        """
        SELECT prediction_date, model_version,
               composite_score, downtime_prob_7d, mev_tax_rate, decentralization_score
          FROM predictions
         WHERE vote_pubkey = :pk
         ORDER BY prediction_date DESC
         LIMIT :limit
        """
    )
    with engine.begin() as conn:
        rows = [dict(r._mapping) for r in conn.execute(sql, {"pk": vote_pubkey, "limit": limit})]
    for r in rows:
        if r.get("prediction_date") is not None:
            r["prediction_date"] = str(r["prediction_date"])
    return {"vote_pubkey": vote_pubkey, "history": rows}


@router.get("/{vote_pubkey}/rank")
def validator_rank(vote_pubkey: str) -> dict:
    """Where does this validator sit in the distribution?

    Returns rank (1 = best) by composite, downtime, mev_tax, decentralization,
    plus the value at the rank-10 / rank-50 cutoffs so an operator can see
    the gap they need to close.
    """
    rank_sql = text(
        """
        WITH latest AS (
          SELECT DISTINCT ON (p.vote_pubkey) p.*
            FROM predictions p
           ORDER BY p.vote_pubkey, p.prediction_date DESC
        ),
        ranked AS (
          SELECT vote_pubkey,
                 composite_score,
                 downtime_prob_7d,
                 mev_tax_rate,
                 decentralization_score,
                 RANK() OVER (ORDER BY composite_score DESC NULLS LAST) AS rank_composite,
                 RANK() OVER (ORDER BY downtime_prob_7d ASC NULLS LAST) AS rank_downtime,
                 RANK() OVER (ORDER BY mev_tax_rate ASC NULLS LAST) AS rank_mev_tax,
                 RANK() OVER (ORDER BY decentralization_score DESC NULLS LAST) AS rank_decentralization,
                 COUNT(*) OVER () AS total
            FROM latest
        )
        SELECT *
          FROM ranked
         WHERE vote_pubkey = :pk
        """
    )
    cutoffs_sql = text(
        """
        WITH latest AS (
          SELECT DISTINCT ON (p.vote_pubkey) p.*
            FROM predictions p
           ORDER BY p.vote_pubkey, p.prediction_date DESC
        ),
        ordered AS (
          SELECT composite_score,
                 ROW_NUMBER() OVER (ORDER BY composite_score DESC NULLS LAST) AS rk
            FROM latest
        )
        SELECT
          (SELECT composite_score FROM ordered WHERE rk = 10) AS top10,
          (SELECT composite_score FROM ordered WHERE rk = 50) AS top50,
          (SELECT composite_score FROM ordered WHERE rk = 100) AS top100
        """
    )
    with engine.begin() as conn:
        row = conn.execute(rank_sql, {"pk": vote_pubkey}).mappings().fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="not found")
        cutoffs = conn.execute(cutoffs_sql).mappings().fetchone() or {}
    total = int(row["total"])
    composite = _f(row["composite_score"])
    return {
        "vote_pubkey": vote_pubkey,
        "total_validators": total,
        "rank_composite": int(row["rank_composite"]),
        "rank_downtime": int(row["rank_downtime"]),
        "rank_mev_tax": int(row["rank_mev_tax"]),
        "rank_decentralization": int(row["rank_decentralization"]),
        "percentile_composite": _percentile(int(row["rank_composite"]), total),
        "current_composite": composite,
        "current_downtime_prob": _f(row["downtime_prob_7d"]),
        "current_mev_tax": _f(row["mev_tax_rate"]),
        "current_decentralization": _f(row["decentralization_score"]),
        "cutoff_top10_composite": _f(cutoffs.get("top10")),
        "cutoff_top50_composite": _f(cutoffs.get("top50")),
        "cutoff_top100_composite": _f(cutoffs.get("top100")),
        "gap_to_top10": _gap(composite, _f(cutoffs.get("top10"))),
        "gap_to_top50": _gap(composite, _f(cutoffs.get("top50"))),
    }


def _f(v):
    if v is None:
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _percentile(rank: int, total: int) -> float | None:
    if total <= 0:
        return None
    return round(1 - (rank - 1) / total, 4)


def _gap(current: float | None, cutoff: float | None) -> float | None:
    if current is None or cutoff is None:
        return None
    return round(cutoff - current, 4)


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
