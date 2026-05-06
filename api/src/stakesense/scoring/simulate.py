"""Stake migration simulator.

Given a `before` and `after` allocation (each a list of validator+SOL),
compute stake-weighted metrics, concentration, and deltas for each.

Pure functions — I/O lives in the API router.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class Allocation:
    voter_pubkey: str
    sol: float
    validator_name: str | None = None
    composite_score: float | None = None
    downtime_prob_7d: float | None = None
    mev_tax_rate: float | None = None
    decentralization_score: float | None = None
    data_center: str | None = None
    asn: str | None = None
    country: str | None = None


@dataclass
class ConcentrationBucket:
    label: str
    sol: float
    pct: float


@dataclass
class AllocationReport:
    total_sol: float
    weighted_composite: float | None
    weighted_downtime_prob: float | None
    weighted_mev_tax: float | None
    weighted_decentralization: float | None
    by_data_center: list[ConcentrationBucket]
    by_asn: list[ConcentrationBucket]
    by_country: list[ConcentrationBucket]
    n_validators: int


@dataclass
class Delta:
    composite: float | None
    downtime_prob: float | None
    mev_tax: float | None
    decentralization: float | None
    top_dc_pct: float | None
    top_asn_pct: float | None
    top_country_pct: float | None
    insights: list[str] = field(default_factory=list)


@dataclass
class SimulationReport:
    before: AllocationReport
    after: AllocationReport
    delta: Delta


def _weighted_avg(positions: list[Allocation], attr: str) -> float | None:
    total = 0.0
    weighted = 0.0
    for p in positions:
        v = getattr(p, attr)
        if v is None:
            continue
        total += p.sol
        weighted += v * p.sol
    if total <= 0:
        return None
    return weighted / total


def _bucket(positions: list[Allocation], attr: str) -> list[ConcentrationBucket]:
    total = sum(p.sol for p in positions)
    if total <= 0:
        return []
    by: dict[str, float] = {}
    for p in positions:
        label = getattr(p, attr) or "(unknown)"
        by[label] = by.get(label, 0.0) + p.sol
    out = [
        ConcentrationBucket(
            label=label, sol=round(sol, 6), pct=round(sol / total, 6)
        )
        for label, sol in by.items()
    ]
    out.sort(key=lambda b: b.sol, reverse=True)
    return out


def build_allocation_report(positions: list[Allocation]) -> AllocationReport:
    total_sol = sum(p.sol for p in positions)
    n_validators = len({p.voter_pubkey for p in positions})
    return AllocationReport(
        total_sol=round(total_sol, 6),
        weighted_composite=_weighted_avg(positions, "composite_score"),
        weighted_downtime_prob=_weighted_avg(positions, "downtime_prob_7d"),
        weighted_mev_tax=_weighted_avg(positions, "mev_tax_rate"),
        weighted_decentralization=_weighted_avg(positions, "decentralization_score"),
        by_data_center=_bucket(positions, "data_center"),
        by_asn=_bucket(positions, "asn"),
        by_country=_bucket(positions, "country"),
        n_validators=n_validators,
    )


def _delta_or_none(after: float | None, before: float | None) -> float | None:
    if after is None or before is None:
        return None
    return round(after - before, 6)


def _top_pct(buckets: list[ConcentrationBucket]) -> float | None:
    return buckets[0].pct if buckets else None


def _build_insights(before: AllocationReport, after: AllocationReport) -> list[str]:
    insights: list[str] = []

    def fmt_pct(x: float) -> str:
        return f"{x * 100:+.1f} pp"

    def fmt_bps(x: float) -> str:
        # Smaller deltas — show as decimal change
        return f"{x:+.3f}"

    if (
        before.weighted_composite is not None
        and after.weighted_composite is not None
    ):
        d = after.weighted_composite - before.weighted_composite
        if abs(d) >= 0.005:
            verb = "improves" if d > 0 else "drops"
            insights.append(
                f"Stake-weighted composite {verb} {fmt_bps(d)} "
                f"({before.weighted_composite:.3f} → {after.weighted_composite:.3f})"
            )

    if (
        before.weighted_downtime_prob is not None
        and after.weighted_downtime_prob is not None
    ):
        d = after.weighted_downtime_prob - before.weighted_downtime_prob
        if abs(d) >= 0.005:
            verb = "drops" if d < 0 else "rises"
            insights.append(
                f"Downtime risk {verb} {fmt_pct(d)} "
                f"({before.weighted_downtime_prob:.1%} → "
                f"{after.weighted_downtime_prob:.1%})"
            )

    if (
        before.weighted_mev_tax is not None
        and after.weighted_mev_tax is not None
    ):
        d = after.weighted_mev_tax - before.weighted_mev_tax
        if abs(d) >= 0.002:
            verb = "drops" if d < 0 else "rises"
            insights.append(
                f"MEV tax {verb} {fmt_pct(d)} "
                f"({before.weighted_mev_tax:.2%} → "
                f"{after.weighted_mev_tax:.2%})"
            )

    if (
        before.weighted_decentralization is not None
        and after.weighted_decentralization is not None
    ):
        d = after.weighted_decentralization - before.weighted_decentralization
        if abs(d) >= 0.005:
            verb = "improves" if d > 0 else "drops"
            insights.append(
                f"Decentralization score {verb} {fmt_bps(d)} "
                f"({before.weighted_decentralization:.3f} → "
                f"{after.weighted_decentralization:.3f})"
            )

    # Concentration shifts
    for label, attr in (
        ("data center", "by_data_center"),
        ("ASN", "by_asn"),
        ("country", "by_country"),
    ):
        b = getattr(before, attr)
        a = getattr(after, attr)
        if b and a:
            d = a[0].pct - b[0].pct
            if abs(d) >= 0.05:
                verb = "concentration grows" if d > 0 else "concentration eases"
                insights.append(
                    f"Top-{label} {verb} {fmt_pct(d)} "
                    f"({b[0].pct:.0%} → {a[0].pct:.0%})"
                )

    if not insights:
        insights.append("No material change between allocations.")
    return insights


def simulate(
    before_positions: list[Allocation],
    after_positions: list[Allocation],
) -> SimulationReport:
    before = build_allocation_report(before_positions)
    after = build_allocation_report(after_positions)
    delta = Delta(
        composite=_delta_or_none(after.weighted_composite, before.weighted_composite),
        downtime_prob=_delta_or_none(
            after.weighted_downtime_prob, before.weighted_downtime_prob
        ),
        mev_tax=_delta_or_none(after.weighted_mev_tax, before.weighted_mev_tax),
        decentralization=_delta_or_none(
            after.weighted_decentralization, before.weighted_decentralization
        ),
        top_dc_pct=_delta_or_none(_top_pct(after.by_data_center), _top_pct(before.by_data_center)),
        top_asn_pct=_delta_or_none(_top_pct(after.by_asn), _top_pct(before.by_asn)),
        top_country_pct=_delta_or_none(_top_pct(after.by_country), _top_pct(before.by_country)),
        insights=_build_insights(before, after),
    )
    return SimulationReport(before=before, after=after, delta=delta)


def hydrate_allocations(
    raw: list[dict[str, Any]],
    score_rows: dict[str, dict[str, Any]],
) -> list[Allocation]:
    """Attach scoring + metadata to raw {voter_pubkey, sol} rows."""
    out: list[Allocation] = []
    for r in raw:
        vp = r["voter_pubkey"]
        info = score_rows.get(vp, {})
        out.append(
            Allocation(
                voter_pubkey=vp,
                sol=float(r["sol"]),
                validator_name=info.get("name"),
                composite_score=_to_float(info.get("composite_score")),
                downtime_prob_7d=_to_float(info.get("downtime_prob_7d")),
                mev_tax_rate=_to_float(info.get("mev_tax_rate")),
                decentralization_score=_to_float(info.get("decentralization_score")),
                data_center=info.get("data_center"),
                asn=info.get("asn"),
                country=info.get("country"),
            )
        )
    return out


def _to_float(v) -> float | None:
    if v is None:
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None
