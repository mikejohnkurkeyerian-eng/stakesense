"""Tests for stake migration simulator (pure functions)."""
from __future__ import annotations

from stakesense.scoring.simulate import (
    Allocation,
    build_allocation_report,
    hydrate_allocations,
    simulate,
)


def _alloc(**kwargs) -> Allocation:
    base = dict(
        voter_pubkey="VotePk1",
        sol=10.0,
        validator_name="Alpha",
        composite_score=0.8,
        downtime_prob_7d=0.1,
        mev_tax_rate=0.05,
        decentralization_score=0.6,
        data_center="DC-A",
        asn="ASN-1",
        country="US",
    )
    base.update(kwargs)
    return Allocation(**base)


def test_empty_allocation_returns_none_metrics() -> None:
    r = build_allocation_report([])
    assert r.total_sol == 0.0
    assert r.weighted_composite is None
    assert r.by_data_center == []


def test_single_allocation_aggregates() -> None:
    r = build_allocation_report([_alloc(sol=10.0)])
    assert r.total_sol == 10.0
    assert r.weighted_composite == 0.8
    assert r.n_validators == 1


def test_two_allocations_weighted_average() -> None:
    a = _alloc(sol=10.0, composite_score=0.9)
    b = _alloc(voter_pubkey="VotePk2", sol=30.0, composite_score=0.5)
    r = build_allocation_report([a, b])
    # (0.9*10 + 0.5*30) / 40 = 0.6
    assert abs((r.weighted_composite or 0) - 0.6) < 1e-9


def test_simulate_improvement_produces_positive_composite_delta() -> None:
    before = [_alloc(composite_score=0.4, downtime_prob_7d=0.5)]
    after = [_alloc(voter_pubkey="VotePk2", composite_score=0.9, downtime_prob_7d=0.05)]
    sim = simulate(before, after)
    assert sim.delta.composite is not None
    assert sim.delta.composite > 0
    assert sim.delta.downtime_prob is not None
    assert sim.delta.downtime_prob < 0


def test_simulate_insights_describe_composite_change() -> None:
    before = [_alloc(composite_score=0.4)]
    after = [_alloc(voter_pubkey="VotePk2", composite_score=0.9)]
    sim = simulate(before, after)
    text = " ".join(sim.delta.insights).lower()
    assert "composite" in text


def test_simulate_concentration_delta_picked_up() -> None:
    # Before: all in one DC. After: spread across two DCs.
    before = [
        _alloc(voter_pubkey="V1", sol=50, data_center="DC-A"),
        _alloc(voter_pubkey="V2", sol=50, data_center="DC-A"),
    ]
    after = [
        _alloc(voter_pubkey="V1", sol=50, data_center="DC-A"),
        _alloc(voter_pubkey="V2", sol=50, data_center="DC-B"),
    ]
    sim = simulate(before, after)
    assert sim.delta.top_dc_pct is not None
    assert sim.delta.top_dc_pct < 0  # top concentration eased


def test_simulate_no_change_emits_baseline_insight() -> None:
    same = [_alloc()]
    sim = simulate(same, same)
    assert any("no material" in i.lower() for i in sim.delta.insights)


def test_hydrate_attaches_score_rows() -> None:
    raw = [{"voter_pubkey": "VotePk1", "sol": 12.5}]
    rows = {
        "VotePk1": {
            "name": "Alpha",
            "composite_score": 0.77,
            "downtime_prob_7d": 0.12,
            "mev_tax_rate": 0.03,
            "decentralization_score": 0.55,
            "data_center": "DC-X",
            "asn": "AS-99",
            "country": "DE",
        }
    }
    out = hydrate_allocations(raw, rows)
    assert len(out) == 1
    assert out[0].validator_name == "Alpha"
    assert out[0].composite_score == 0.77
    assert out[0].country == "DE"


def test_hydrate_handles_missing_score_row() -> None:
    raw = [{"voter_pubkey": "Unknown", "sol": 5.0}]
    out = hydrate_allocations(raw, {})
    assert len(out) == 1
    assert out[0].sol == 5.0
    assert out[0].composite_score is None
    assert out[0].validator_name is None


def test_hydrate_coerces_decimal_strings() -> None:
    raw = [{"voter_pubkey": "VotePk1", "sol": 1.0}]
    rows = {"VotePk1": {"composite_score": "0.42"}}
    out = hydrate_allocations(raw, rows)
    assert out[0].composite_score == 0.42
