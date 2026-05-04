"""Portfolio risk scoring.

Given a wallet's stake accounts and the validator scoring layer, compute:
- Stake-weighted exposure to predicted downtime, MEV tax, decentralization
- Concentration metrics (data_center / asn / country)
- Risk warnings (superminority, concentration thresholds)
- Rebalance recommendations

Pure functions; the I/O lives in the API router.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class StakePosition:
    """One row in the portfolio analyzer."""

    stake_account: str
    voter_pubkey: str | None
    sol: float
    lamports: int
    state: str
    validator_name: str | None = None
    composite_score: float | None = None
    downtime_prob_7d: float | None = None
    mev_tax_rate: float | None = None
    decentralization_score: float | None = None
    data_center: str | None = None
    asn: str | None = None
    country: str | None = None
    commission_pct: int | None = None


@dataclass
class ConcentrationBucket:
    label: str
    sol: float
    pct_of_portfolio: float
    n_validators: int


@dataclass
class RiskWarning:
    severity: str  # info | warn | high
    message: str
    detail: str | None = None


@dataclass
class RebalanceSuggestion:
    from_stake_account: str
    from_voter_pubkey: str
    from_validator_name: str | None
    reason: str
    suggested_voter_pubkey: str
    suggested_validator_name: str | None
    suggested_composite: float | None


@dataclass
class PortfolioReport:
    owner_pubkey: str
    positions: list[StakePosition]
    total_sol: float
    total_active_sol: float
    weighted_composite: float | None
    weighted_downtime_prob: float | None
    weighted_mev_tax: float | None
    weighted_decentralization: float | None
    concentration_by_data_center: list[ConcentrationBucket]
    concentration_by_asn: list[ConcentrationBucket]
    concentration_by_country: list[ConcentrationBucket]
    warnings: list[RiskWarning] = field(default_factory=list)
    rebalance_suggestions: list[RebalanceSuggestion] = field(default_factory=list)


def _weighted_avg(positions: list[StakePosition], attr: str) -> float | None:
    """Stake-weighted mean of a pillar score across active positions only."""
    total = 0.0
    weighted = 0.0
    for p in positions:
        if p.voter_pubkey is None:
            continue
        v = getattr(p, attr)
        if v is None:
            continue
        total += p.sol
        weighted += v * p.sol
    if total <= 0:
        return None
    return weighted / total


def _bucket_concentration(
    positions: list[StakePosition],
    attr: str,
) -> list[ConcentrationBucket]:
    """Group positions by `attr` and report per-bucket SOL + % share."""
    total_sol = sum(p.sol for p in positions if p.voter_pubkey)
    if total_sol <= 0:
        return []
    by: dict[str, dict[str, Any]] = {}
    for p in positions:
        if p.voter_pubkey is None:
            continue
        label = getattr(p, attr) or "(unknown)"
        b = by.setdefault(
            label,
            {"sol": 0.0, "validators": set()},
        )
        b["sol"] += p.sol
        b["validators"].add(p.voter_pubkey)
    out = [
        ConcentrationBucket(
            label=label,
            sol=round(d["sol"], 6),
            pct_of_portfolio=round(d["sol"] / total_sol, 6),
            n_validators=len(d["validators"]),
        )
        for label, d in by.items()
    ]
    out.sort(key=lambda b: b.sol, reverse=True)
    return out


def _build_warnings(report: PortfolioReport) -> list[RiskWarning]:
    warnings: list[RiskWarning] = []
    if report.total_active_sol == 0:
        warnings.append(
            RiskWarning(
                severity="info",
                message="No active stake delegations on file.",
                detail="The wallet has stake accounts but none are currently delegated to a validator.",
            )
        )
        return warnings

    # Concentration thresholds
    if report.concentration_by_data_center:
        top_dc = report.concentration_by_data_center[0]
        if top_dc.pct_of_portfolio >= 0.5 and top_dc.label != "(unknown)":
            warnings.append(
                RiskWarning(
                    severity="high" if top_dc.pct_of_portfolio >= 0.75 else "warn",
                    message=f"{top_dc.pct_of_portfolio:.0%} of stake is in one data center",
                    detail=f"Data center: {top_dc.label}. Concentration risk if that data center has an outage.",
                )
            )
    if report.concentration_by_asn:
        top_asn = report.concentration_by_asn[0]
        if top_asn.pct_of_portfolio >= 0.6 and top_asn.label != "(unknown)":
            warnings.append(
                RiskWarning(
                    severity="warn",
                    message=f"{top_asn.pct_of_portfolio:.0%} of stake shares one ASN",
                    detail=f"ASN: {top_asn.label}.",
                )
            )
    if report.concentration_by_country:
        top_c = report.concentration_by_country[0]
        if top_c.pct_of_portfolio >= 0.8 and top_c.label != "(unknown)":
            warnings.append(
                RiskWarning(
                    severity="info",
                    message=f"{top_c.pct_of_portfolio:.0%} of stake is in one country",
                    detail=f"Country: {top_c.label}. Geographic concentration may matter for regulatory tail risk.",
                )
            )

    # Stake-weighted downtime risk
    if (
        report.weighted_downtime_prob is not None
        and report.weighted_downtime_prob >= 0.20
    ):
        warnings.append(
            RiskWarning(
                severity="high" if report.weighted_downtime_prob >= 0.40 else "warn",
                message=f"Stake-weighted downtime risk is {report.weighted_downtime_prob:.0%}",
                detail="Consider rebalancing toward validators with lower downtime predictions.",
            )
        )

    # Worst single position
    worst = sorted(
        [p for p in report.positions if p.composite_score is not None],
        key=lambda p: p.composite_score or 0.0,
    )
    if worst and worst[0].composite_score is not None and worst[0].composite_score < 0.5:
        warnings.append(
            RiskWarning(
                severity="warn",
                message=f"Lowest-scored position: {worst[0].validator_name or worst[0].voter_pubkey[:8]} (composite {worst[0].composite_score:.2f})",
                detail="See the rebalance suggestions below for higher-scored alternatives.",
            )
        )

    return warnings


def _suggest_rebalances(
    positions: list[StakePosition],
    candidates: list[dict[str, Any]],
    *,
    max_suggestions: int = 3,
    score_gap: float = 0.10,
) -> list[RebalanceSuggestion]:
    """Pair the worst-scoring positions with the best available candidates.

    `candidates` is a list of validator rows (dicts) sorted by composite
    score descending. We skip candidates the user is already staking with.
    """
    if not positions or not candidates:
        return []
    held_voters = {p.voter_pubkey for p in positions if p.voter_pubkey}
    scored = [
        p for p in positions if p.voter_pubkey and p.composite_score is not None
    ]
    if not scored:
        return []
    scored.sort(key=lambda p: p.composite_score or 0.0)

    fresh_candidates = [c for c in candidates if c["vote_pubkey"] not in held_voters]
    if not fresh_candidates:
        return []
    suggestions: list[RebalanceSuggestion] = []
    for pos in scored[:max_suggestions]:
        best = fresh_candidates[0]
        if pos.composite_score is None:
            continue
        gap = (best.get("composite_score") or 0.0) - pos.composite_score
        if gap < score_gap:
            continue
        reason_parts: list[str] = []
        reason_parts.append(
            f"composite {pos.composite_score:.2f} → {best['composite_score']:.2f}"
        )
        if pos.downtime_prob_7d is not None and best.get("downtime_prob_7d") is not None:
            reason_parts.append(
                f"downtime risk {pos.downtime_prob_7d:.2f} → {best['downtime_prob_7d']:.2f}"
            )
        suggestions.append(
            RebalanceSuggestion(
                from_stake_account=pos.stake_account,
                from_voter_pubkey=pos.voter_pubkey or "",
                from_validator_name=pos.validator_name,
                reason=", ".join(reason_parts),
                suggested_voter_pubkey=best["vote_pubkey"],
                suggested_validator_name=best.get("name"),
                suggested_composite=best.get("composite_score"),
            )
        )
        # Make sure two suggestions don't collide on the same target
        fresh_candidates = [
            c for c in fresh_candidates if c["vote_pubkey"] != best["vote_pubkey"]
        ]
        if not fresh_candidates:
            break
    return suggestions


def build_report(
    owner_pubkey: str,
    positions: list[StakePosition],
    candidates: list[dict[str, Any]] | None = None,
) -> PortfolioReport:
    """Aggregate metrics + warnings from a list of scored stake positions.

    `candidates` are validator rows (dicts with keys: vote_pubkey, name,
    composite_score, downtime_prob_7d, mev_tax_rate, decentralization_score)
    sorted by composite_score descending, used to fuel rebalance
    recommendations. Pass `None` to skip rebalances.
    """
    total_sol = sum(p.sol for p in positions)
    total_active_sol = sum(p.sol for p in positions if p.voter_pubkey)
    report = PortfolioReport(
        owner_pubkey=owner_pubkey,
        positions=positions,
        total_sol=round(total_sol, 6),
        total_active_sol=round(total_active_sol, 6),
        weighted_composite=_weighted_avg(positions, "composite_score"),
        weighted_downtime_prob=_weighted_avg(positions, "downtime_prob_7d"),
        weighted_mev_tax=_weighted_avg(positions, "mev_tax_rate"),
        weighted_decentralization=_weighted_avg(positions, "decentralization_score"),
        concentration_by_data_center=_bucket_concentration(positions, "data_center"),
        concentration_by_asn=_bucket_concentration(positions, "asn"),
        concentration_by_country=_bucket_concentration(positions, "country"),
    )
    report.warnings = _build_warnings(report)
    if candidates:
        report.rebalance_suggestions = _suggest_rebalances(positions, candidates)
    return report
