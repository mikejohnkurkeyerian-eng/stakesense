"""Anomaly / change detection across the validator dataset.

Surfaces validators whose state has shifted noticeably between the most
recent two observations stakesense has on file. Useful for delegators
who want to know "what changed that I should care about?" without
manually diffing snapshots.

Detections:
- MEV commission jumps (delta > 5 pp)
- Newly delinquent (latest epoch_performance row delinquent=true and prior wasn't)
- Composite-score drops (delta < -0.05)
- Score climbers (delta > +0.05) — both directions of news
"""
from __future__ import annotations

from fastapi import APIRouter, Query
from sqlalchemy import text

from stakesense.db import engine

router = APIRouter(prefix="/api/v1/anomalies", tags=["anomalies"])


@router.get("")
def anomalies(limit: int = Query(20, ge=1, le=100)) -> dict:
    """Return the most notable recent changes across all validators.

    Each detection includes the kind, the validator, the magnitude,
    and a short human-readable summary.
    """
    detections: list[dict] = []
    with engine.begin() as conn:
        detections.extend(_mev_commission_jumps(conn, limit))
        detections.extend(_newly_delinquent(conn, limit))
        detections.extend(_composite_movers(conn, limit))
    detections.sort(key=lambda d: abs(d.get("magnitude", 0)), reverse=True)
    return {"detections": detections[:limit]}


def _mev_commission_jumps(conn, limit: int) -> list[dict]:
    sql = text(
        """
        WITH ordered AS (
          SELECT mo.vote_pubkey, mo.epoch, mo.mev_commission_pct,
                 ROW_NUMBER() OVER (PARTITION BY mo.vote_pubkey ORDER BY mo.epoch DESC) AS rn
            FROM mev_observations mo
        ),
        last_two AS (
          SELECT vote_pubkey,
                 MAX(CASE WHEN rn = 1 THEN mev_commission_pct END) AS current_pct,
                 MAX(CASE WHEN rn = 1 THEN epoch END) AS current_epoch,
                 MAX(CASE WHEN rn = 2 THEN mev_commission_pct END) AS prior_pct,
                 MAX(CASE WHEN rn = 2 THEN epoch END) AS prior_epoch
            FROM ordered
           WHERE rn <= 2
           GROUP BY vote_pubkey
          HAVING COUNT(*) = 2
        )
        SELECT lt.*, v.name
          FROM last_two lt
          JOIN validators v ON v.vote_pubkey = lt.vote_pubkey
         WHERE ABS(lt.current_pct - lt.prior_pct) >= 5
         ORDER BY ABS(lt.current_pct - lt.prior_pct) DESC
         LIMIT :limit
        """
    )
    rows = conn.execute(sql, {"limit": limit}).mappings().all()
    out = []
    for r in rows:
        delta = float(r["current_pct"]) - float(r["prior_pct"])
        direction = "up" if delta > 0 else "down"
        out.append(
            {
                "kind": "mev_commission_change",
                "vote_pubkey": r["vote_pubkey"],
                "name": r["name"],
                "magnitude": delta,
                "summary": (
                    f"MEV commission moved {direction} {abs(delta):.1f} pp "
                    f"(epoch {r['prior_epoch']} → {r['current_epoch']}, "
                    f"{r['prior_pct']:.1f}% → {r['current_pct']:.1f}%)"
                ),
                "epoch": int(r["current_epoch"]),
            }
        )
    return out


def _newly_delinquent(conn, limit: int) -> list[dict]:
    sql = text(
        """
        WITH ordered AS (
          SELECT ep.vote_pubkey, ep.epoch, ep.delinquent,
                 ROW_NUMBER() OVER (PARTITION BY ep.vote_pubkey ORDER BY ep.epoch DESC) AS rn
            FROM epoch_performance ep
        )
        SELECT o1.vote_pubkey, o1.epoch AS current_epoch, v.name
          FROM ordered o1
          LEFT JOIN ordered o2 ON o2.vote_pubkey = o1.vote_pubkey AND o2.rn = 2
          JOIN validators v ON v.vote_pubkey = o1.vote_pubkey
         WHERE o1.rn = 1
           AND o1.delinquent = true
           AND (o2.delinquent IS NULL OR o2.delinquent = false)
         LIMIT :limit
        """
    )
    rows = conn.execute(sql, {"limit": limit}).mappings().all()
    return [
        {
            "kind": "newly_delinquent",
            "vote_pubkey": r["vote_pubkey"],
            "name": r["name"],
            "magnitude": 1.0,
            "summary": f"Became delinquent in epoch {r['current_epoch']}",
            "epoch": int(r["current_epoch"]),
        }
        for r in rows
    ]


def _composite_movers(conn, limit: int) -> list[dict]:
    sql = text(
        """
        WITH ordered AS (
          SELECT p.vote_pubkey, p.prediction_date, p.composite_score,
                 ROW_NUMBER() OVER (PARTITION BY p.vote_pubkey ORDER BY p.prediction_date DESC) AS rn
            FROM predictions p
        ),
        last_two AS (
          SELECT vote_pubkey,
                 MAX(CASE WHEN rn = 1 THEN composite_score END) AS current_score,
                 MAX(CASE WHEN rn = 1 THEN prediction_date END) AS current_date,
                 MAX(CASE WHEN rn = 2 THEN composite_score END) AS prior_score,
                 MAX(CASE WHEN rn = 2 THEN prediction_date END) AS prior_date
            FROM ordered
           WHERE rn <= 2
           GROUP BY vote_pubkey
          HAVING COUNT(*) = 2
        )
        SELECT lt.*, v.name
          FROM last_two lt
          JOIN validators v ON v.vote_pubkey = lt.vote_pubkey
         WHERE lt.current_score IS NOT NULL
           AND lt.prior_score IS NOT NULL
           AND ABS(lt.current_score - lt.prior_score) >= 0.05
         ORDER BY ABS(lt.current_score - lt.prior_score) DESC
         LIMIT :limit
        """
    )
    rows = conn.execute(sql, {"limit": limit}).mappings().all()
    out = []
    for r in rows:
        delta = float(r["current_score"]) - float(r["prior_score"])
        direction = "up" if delta > 0 else "down"
        kind = "composite_climb" if delta > 0 else "composite_drop"
        out.append(
            {
                "kind": kind,
                "vote_pubkey": r["vote_pubkey"],
                "name": r["name"],
                "magnitude": delta,
                "summary": (
                    f"Composite moved {direction} {abs(delta) * 100:.1f} pp "
                    f"({r['prior_date']} → {r['current_date']}, "
                    f"{r['prior_score']:.3f} → {r['current_score']:.3f})"
                ),
                "current_date": str(r["current_date"]),
            }
        )
    return out
