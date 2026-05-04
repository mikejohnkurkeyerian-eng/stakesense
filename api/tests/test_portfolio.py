"""Tests for portfolio scoring (pure functions)."""
from __future__ import annotations

from stakesense.scoring.portfolio import (
    StakePosition,
    build_report,
)


def _pos(**kwargs) -> StakePosition:
    base = dict(
        stake_account="StAcc1",
        voter_pubkey="VotePk1",
        sol=10.0,
        lamports=10_000_000_000,
        state="stake",
        validator_name="Alpha",
        composite_score=0.8,
        downtime_prob_7d=0.1,
        mev_tax_rate=0.05,
        decentralization_score=0.6,
        data_center="DC-A",
        asn="ASN-1",
        country="US",
        commission_pct=5,
    )
    base.update(kwargs)
    return StakePosition(**base)


def test_empty_portfolio_is_handled() -> None:
    r = build_report("Owner1", [], [])
    assert r.total_sol == 0.0
    assert r.total_active_sol == 0.0
    assert r.weighted_composite is None
    assert r.warnings, "should warn about no delegations"
    assert r.warnings[0].severity == "info"


def test_single_position_aggregates() -> None:
    r = build_report("Owner1", [_pos()], [])
    assert r.total_sol == 10.0
    assert r.total_active_sol == 10.0
    assert r.weighted_composite == 0.8
    assert r.weighted_downtime_prob == 0.1


def test_two_positions_weighted_average() -> None:
    a = _pos(sol=10.0, composite_score=0.9, downtime_prob_7d=0.1)
    b = _pos(stake_account="StAcc2", voter_pubkey="VotePk2", sol=30.0,
             composite_score=0.5, downtime_prob_7d=0.5, validator_name="Beta",
             data_center="DC-B", asn="ASN-2", country="US")
    r = build_report("Owner1", [a, b], [])
    # Weighted by sol: (0.9*10 + 0.5*30) / 40 = 0.6
    assert abs((r.weighted_composite or 0) - 0.6) < 1e-9
    # Concentration buckets sum to 100%
    pcts = sum(b.pct_of_portfolio for b in r.concentration_by_data_center)
    assert abs(pcts - 1.0) < 1e-9


def test_concentration_bucket_in_one_country_warns() -> None:
    a = _pos(country="US", sol=80.0)
    b = _pos(stake_account="StAcc2", voter_pubkey="VotePk2", country="US",
             sol=20.0, validator_name="Beta",
             data_center="DC-B", asn="ASN-2")
    r = build_report("Owner1", [a, b], [])
    msgs = [w.message for w in r.warnings]
    assert any("country" in m for m in msgs)


def test_high_downtime_warns() -> None:
    high = _pos(downtime_prob_7d=0.6)
    r = build_report("Owner1", [high], [])
    msgs = [w.message for w in r.warnings]
    assert any("downtime" in m for m in msgs)


def test_rebalance_suggestion_when_better_candidate_available() -> None:
    bad = _pos(composite_score=0.4, downtime_prob_7d=0.5)
    candidates = [
        {
            "vote_pubkey": "BetterValidator",
            "name": "Better",
            "composite_score": 0.95,
            "downtime_prob_7d": 0.05,
            "mev_tax_rate": 0.04,
            "decentralization_score": 0.9,
        }
    ]
    r = build_report("Owner1", [bad], candidates)
    assert r.rebalance_suggestions, "should suggest a swap"
    s = r.rebalance_suggestions[0]
    assert s.suggested_voter_pubkey == "BetterValidator"
    assert s.suggested_validator_name == "Better"


def test_no_rebalance_when_already_well_scored() -> None:
    great = _pos(composite_score=0.95)
    candidates = [
        {
            "vote_pubkey": "OtherValidator",
            "name": "Other",
            "composite_score": 0.96,
            "downtime_prob_7d": 0.05,
            "mev_tax_rate": 0.04,
            "decentralization_score": 0.9,
        }
    ]
    r = build_report("Owner1", [great], candidates)
    # Gap is only 0.01 (< 0.10 threshold) → no suggestions
    assert not r.rebalance_suggestions


def test_rebalance_skips_currently_held_voters() -> None:
    bad = _pos(composite_score=0.4, voter_pubkey="VotePk-Held")
    candidates = [
        {
            "vote_pubkey": "VotePk-Held",  # already held — skip
            "name": "Held",
            "composite_score": 0.99,
            "downtime_prob_7d": 0.01,
            "mev_tax_rate": 0.01,
            "decentralization_score": 0.99,
        }
    ]
    r = build_report("Owner1", [bad], candidates)
    assert not r.rebalance_suggestions


def test_undelegated_position_does_not_break_weighted_avg() -> None:
    delegated = _pos(sol=10.0, composite_score=0.9)
    undelegated = _pos(
        stake_account="StAcc2", voter_pubkey=None, sol=5.0,
        composite_score=None, validator_name=None,
        data_center=None, asn=None, country=None,
    )
    r = build_report("Owner1", [delegated, undelegated], [])
    # Total includes both, but weighted_avg only counts delegated
    assert r.total_sol == 15.0
    assert r.total_active_sol == 10.0
    assert r.weighted_composite == 0.9
