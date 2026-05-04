"""Public open-data exports under CC-BY 4.0.

Daily snapshots of predictions, validators, and decentralization data so
researchers, dashboards, wallets, and DAOs can build on stakesense without
hitting our rate-limited query endpoints.
"""
from __future__ import annotations

import csv
import io
from datetime import datetime, timezone

from fastapi import APIRouter
from fastapi.responses import Response, JSONResponse
from sqlalchemy import text

from stakesense.db import engine

router = APIRouter(prefix="/api/v1/export", tags=["export"])


LICENSE_HEADER = (
    "# stakesense — predictions snapshot\n"
    "# License: CC-BY 4.0 (https://creativecommons.org/licenses/by/4.0/)\n"
    "# Attribution: stakesense.onrender.com — github.com/mikejohnkurkeyerian-eng/stakesense\n"
    "# Generated: {ts}\n"
)


def _csv_response(filename: str, rows: list[dict], header_comment: str) -> Response:
    if not rows:
        body = header_comment + "\n"
        return Response(content=body, media_type="text/csv")
    buf = io.StringIO()
    buf.write(header_comment)
    writer = csv.DictWriter(buf, fieldnames=list(rows[0].keys()))
    writer.writeheader()
    for r in rows:
        writer.writerow(r)
    return Response(
        content=buf.getvalue(),
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "public, max-age=300",
        },
    )


@router.get("/predictions.csv")
def predictions_csv() -> Response:
    """Latest composite + pillar predictions for every scored validator (CSV)."""
    sql = text(
        """
        WITH latest AS (
          SELECT DISTINCT ON (p.vote_pubkey) p.*
            FROM predictions p
           ORDER BY p.vote_pubkey, p.prediction_date DESC
        )
        SELECT v.vote_pubkey, v.identity_pubkey, v.name,
               v.commission_pct, v.active_stake, v.data_center,
               v.asn, v.country,
               l.composite_score, l.downtime_prob_7d, l.mev_tax_rate,
               l.decentralization_score, l.model_version, l.prediction_date
          FROM validators v
          JOIN latest l ON l.vote_pubkey = v.vote_pubkey
         ORDER BY l.composite_score DESC NULLS LAST
        """
    )
    with engine.begin() as conn:
        rows = [dict(r._mapping) for r in conn.execute(sql)]
    for r in rows:
        for k, v in list(r.items()):
            if hasattr(v, "isoformat"):
                r[k] = v.isoformat()
    ts = datetime.now(timezone.utc).isoformat()
    header = LICENSE_HEADER.format(ts=ts).replace(
        "predictions snapshot",
        f"predictions snapshot ({len(rows)} rows)",
    )
    return _csv_response("stakesense-predictions.csv", rows, header)


@router.get("/predictions.json")
def predictions_json() -> JSONResponse:
    """Same content as predictions.csv but JSON-encoded."""
    sql = text(
        """
        WITH latest AS (
          SELECT DISTINCT ON (p.vote_pubkey) p.*
            FROM predictions p
           ORDER BY p.vote_pubkey, p.prediction_date DESC
        )
        SELECT v.vote_pubkey, v.identity_pubkey, v.name,
               v.commission_pct, v.active_stake, v.data_center,
               v.asn, v.country,
               l.composite_score, l.downtime_prob_7d, l.mev_tax_rate,
               l.decentralization_score, l.model_version, l.prediction_date
          FROM validators v
          JOIN latest l ON l.vote_pubkey = v.vote_pubkey
         ORDER BY l.composite_score DESC NULLS LAST
        """
    )
    with engine.begin() as conn:
        rows = [dict(r._mapping) for r in conn.execute(sql)]
    for r in rows:
        for k, v in list(r.items()):
            if hasattr(v, "isoformat"):
                r[k] = v.isoformat()
            if v is not None and hasattr(v, "__float__") and not isinstance(v, (int, float, bool, str)):
                try:
                    r[k] = float(v)
                except (TypeError, ValueError):
                    pass
    ts = datetime.now(timezone.utc).isoformat()
    return JSONResponse(
        {
            "license": "CC-BY 4.0",
            "attribution": "stakesense — github.com/mikejohnkurkeyerian-eng/stakesense",
            "generated_at": ts,
            "row_count": len(rows),
            "rows": rows,
        },
        headers={"Cache-Control": "public, max-age=300"},
    )


@router.get("/validators.csv")
def validators_csv() -> Response:
    """Validator catalog (no predictions; identity + metadata only)."""
    sql = text(
        """
        SELECT v.vote_pubkey, v.identity_pubkey, v.name,
               v.commission_pct, v.active_stake,
               m.mev_commission_pct, v.jito_client,
               v.data_center, v.asn, v.country,
               v.first_seen_epoch, v.last_updated
          FROM validators v
          LEFT JOIN LATERAL (
            SELECT mev_commission_pct FROM mev_observations mo
             WHERE mo.vote_pubkey = v.vote_pubkey
             ORDER BY epoch DESC LIMIT 1
          ) m ON TRUE
         WHERE v.active_stake > 0
         ORDER BY v.active_stake DESC
        """
    )
    with engine.begin() as conn:
        rows = [dict(r._mapping) for r in conn.execute(sql)]
    for r in rows:
        for k, v in list(r.items()):
            if hasattr(v, "isoformat"):
                r[k] = v.isoformat()
    ts = datetime.now(timezone.utc).isoformat()
    header = LICENSE_HEADER.format(ts=ts).replace(
        "predictions snapshot",
        f"validator catalog ({len(rows)} rows)",
    )
    return _csv_response("stakesense-validators.csv", rows, header)


@router.get("/decentralization.json")
def decentralization_json() -> JSONResponse:
    """Network-level decentralization snapshot.

    Includes Nakamoto coefficient and concentration breakdowns by data center,
    ASN, and country. Suitable for embedding in dashboards and research.
    """
    nakamoto_sql = text(
        """
        WITH ordered AS (
          SELECT active_stake,
                 ROW_NUMBER() OVER (ORDER BY active_stake DESC) AS rk,
                 SUM(active_stake) OVER (ORDER BY active_stake DESC) AS running_total,
                 SUM(active_stake) OVER () AS total
            FROM validators
           WHERE active_stake IS NOT NULL AND active_stake > 0
        )
        SELECT MIN(rk) AS nakamoto_coefficient,
               (SELECT total FROM ordered LIMIT 1) AS total_stake
          FROM ordered
         WHERE running_total > total / 3
        """
    )
    cluster_sql = text(
        """
        SELECT COALESCE({col}, '(unknown)') AS cluster,
               COUNT(*) AS n_validators,
               SUM(active_stake) AS total_stake
          FROM validators
         WHERE active_stake > 0
         GROUP BY {col}
         ORDER BY n_validators DESC
         LIMIT 25
        """
    )
    with engine.begin() as conn:
        nk_row = conn.execute(nakamoto_sql).mappings().fetchone() or {}
        clusters: dict[str, list[dict]] = {}
        for col in ("data_center", "asn", "country"):
            clusters[col] = [
                {
                    "cluster": r["cluster"],
                    "n_validators": int(r["n_validators"]),
                    "total_stake": int(r["total_stake"] or 0),
                }
                for r in conn.execute(text(cluster_sql.text.replace("{col}", col)))
                .mappings()
                .all()
            ]
    return JSONResponse(
        {
            "license": "CC-BY 4.0",
            "attribution": "stakesense — github.com/mikejohnkurkeyerian-eng/stakesense",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "nakamoto_coefficient": int(nk_row["nakamoto_coefficient"])
            if nk_row.get("nakamoto_coefficient") is not None
            else None,
            "total_stake": int(nk_row["total_stake"])
            if nk_row.get("total_stake") is not None
            else None,
            "clusters": clusters,
        },
        headers={"Cache-Control": "public, max-age=600"},
    )


@router.get("/manifest.json")
def manifest() -> JSONResponse:
    """Self-describing manifest of available exports.

    Useful for tools that want to discover stakesense data programmatically
    (research scrapers, MCP servers, AI agents).
    """
    base = "/api/v1/export"
    return JSONResponse(
        {
            "license": "CC-BY 4.0",
            "attribution": "stakesense — github.com/mikejohnkurkeyerian-eng/stakesense",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "schema_version": "1",
            "exports": [
                {
                    "id": "predictions",
                    "url": f"{base}/predictions.csv",
                    "json_url": f"{base}/predictions.json",
                    "description": "Latest composite + pillar predictions for every scored validator",
                    "refresh": "twice daily",
                    "fields": [
                        "vote_pubkey", "identity_pubkey", "name",
                        "commission_pct", "active_stake", "data_center",
                        "asn", "country", "composite_score",
                        "downtime_prob_7d", "mev_tax_rate",
                        "decentralization_score", "model_version",
                        "prediction_date",
                    ],
                },
                {
                    "id": "validators",
                    "url": f"{base}/validators.csv",
                    "description": "Validator catalog with metadata (no predictions)",
                    "refresh": "twice daily",
                    "fields": [
                        "vote_pubkey", "identity_pubkey", "name",
                        "commission_pct", "active_stake",
                        "mev_commission_pct", "jito_client",
                        "data_center", "asn", "country",
                        "first_seen_epoch", "last_updated",
                    ],
                },
                {
                    "id": "decentralization",
                    "url": f"{base}/decentralization.json",
                    "description": "Nakamoto coefficient + cluster breakdowns",
                    "refresh": "twice daily",
                    "fields": [
                        "nakamoto_coefficient", "total_stake",
                        "clusters.data_center", "clusters.asn",
                        "clusters.country",
                    ],
                },
            ],
        }
    )
