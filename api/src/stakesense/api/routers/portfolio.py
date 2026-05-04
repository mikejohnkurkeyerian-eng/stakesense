"""Portfolio analyzer — score a wallet's existing stake delegations."""
from __future__ import annotations

import re
from dataclasses import asdict

from fastapi import APIRouter, HTTPException
from sqlalchemy import text

from stakesense.config import settings
from stakesense.db import engine
from stakesense.scoring.portfolio import StakePosition, build_report
from stakesense.sources.stake_accounts import fetch_stake_accounts_for_owner

router = APIRouter(prefix="/api/v1/portfolio", tags=["portfolio"])

# Solana base58 pubkey loose validation: 32-44 chars, base58 alphabet
_PK_RE = re.compile(r"^[1-9A-HJ-NP-Za-km-z]{32,44}$")


@router.get("/{owner_pubkey}")
async def analyze_portfolio(owner_pubkey: str) -> dict:
    if not _PK_RE.match(owner_pubkey):
        raise HTTPException(
            status_code=400,
            detail="Invalid pubkey: expected base58, 32-44 chars",
        )

    rpc_url = settings.helius_rpc_url
    if not rpc_url:
        raise HTTPException(
            status_code=503,
            detail="Solana RPC not configured on the server.",
        )

    try:
        stake_accounts = await fetch_stake_accounts_for_owner(rpc_url, owner_pubkey)
    except Exception as e:  # noqa: BLE001 — surface as 502 with detail
        raise HTTPException(
            status_code=502,
            detail=f"RPC error fetching stake accounts: {e}",
        ) from e

    if not stake_accounts:
        return {
            "owner_pubkey": owner_pubkey,
            "positions": [],
            "total_sol": 0.0,
            "total_active_sol": 0.0,
            "weighted_composite": None,
            "weighted_downtime_prob": None,
            "weighted_mev_tax": None,
            "weighted_decentralization": None,
            "concentration_by_data_center": [],
            "concentration_by_asn": [],
            "concentration_by_country": [],
            "warnings": [
                {
                    "severity": "info",
                    "message": "No stake accounts found for this wallet.",
                    "detail": "Stake from /stake to start building a position.",
                }
            ],
            "rebalance_suggestions": [],
        }

    voters = sorted({a.voter_pubkey for a in stake_accounts if a.voter_pubkey})
    score_rows: dict[str, dict] = {}
    if voters:
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
        with engine.begin() as conn:
            for row in conn.execute(sql, {"voters": voters}).mappings().all():
                score_rows[row["vote_pubkey"]] = dict(row)

    positions: list[StakePosition] = []
    for a in stake_accounts:
        info = score_rows.get(a.voter_pubkey or "", {})
        positions.append(
            StakePosition(
                stake_account=a.pubkey,
                voter_pubkey=a.voter_pubkey,
                sol=a.sol,
                lamports=a.lamports,
                state=a.state,
                validator_name=info.get("name"),
                composite_score=_to_float(info.get("composite_score")),
                downtime_prob_7d=_to_float(info.get("downtime_prob_7d")),
                mev_tax_rate=_to_float(info.get("mev_tax_rate")),
                decentralization_score=_to_float(info.get("decentralization_score")),
                data_center=info.get("data_center"),
                asn=info.get("asn"),
                country=info.get("country"),
                commission_pct=info.get("commission_pct"),
            )
        )

    candidates = _fetch_candidate_validators()
    report = build_report(owner_pubkey, positions, candidates)
    return _serialize(report)


def _to_float(v) -> float | None:
    if v is None:
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _fetch_candidate_validators(limit: int = 25) -> list[dict]:
    """Top-N validators for rebalance suggestions."""
    sql = text(
        """
        WITH latest AS (
          SELECT DISTINCT ON (p.vote_pubkey) p.*
            FROM predictions p
           ORDER BY p.vote_pubkey, p.prediction_date DESC
        )
        SELECT v.vote_pubkey, v.name,
               l.composite_score, l.downtime_prob_7d, l.mev_tax_rate,
               l.decentralization_score
          FROM validators v
          JOIN latest l ON l.vote_pubkey = v.vote_pubkey
         WHERE l.composite_score IS NOT NULL
         ORDER BY l.composite_score DESC,
                  v.commission_pct ASC NULLS LAST,
                  v.active_stake ASC NULLS LAST
         LIMIT :limit
        """
    )
    with engine.begin() as conn:
        rows = conn.execute(sql, {"limit": limit}).mappings().all()
    out = []
    for r in rows:
        d = dict(r)
        for k in (
            "composite_score",
            "downtime_prob_7d",
            "mev_tax_rate",
            "decentralization_score",
        ):
            d[k] = _to_float(d.get(k))
        out.append(d)
    return out


def _serialize(report) -> dict:
    out = asdict(report)
    return out
