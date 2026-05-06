"""Tests for portfolio auto-optimizer (pure functions)."""
from __future__ import annotations

from stakesense.scoring.optimize import optimize


def _pos(**kw):
    base = {
        "voter_pubkey": "Held1",
        "sol": 100.0,
        "composite_score": 0.4,
        "downtime_prob_7d": 0.3,
        "decentralization_score": 0.3,
        "data_center": "DC-A",
        "name": "Worst",
    }
    base.update(kw)
    return base


def _cand(**kw):
    base = {
        "vote_pubkey": "Better1",
        "name": "Better1",
        "composite_score": 0.95,
        "downtime_prob_7d": 0.05,
        "decentralization_score": 0.9,
        "data_center": "DC-B",
    }
    base.update(kw)
    return base


def test_empty_positions_returns_empty_result() -> None:
    r = optimize([], [_cand()])
    assert r.moves == []
    assert any("No positions" in n for n in r.notes)


def test_no_candidates_returns_empty_result() -> None:
    r = optimize([_pos()], [])
    assert r.moves == []


def test_proposes_a_swap_for_underperformer() -> None:
    r = optimize([_pos()], [_cand()])
    assert len(r.moves) == 1
    m = r.moves[0]
    assert m.from_voter_pubkey == "Held1"
    assert m.to_voter_pubkey == "Better1"
    assert m.objective_delta > 0
    assert r.objective_before == 0.4
    assert r.objective_after == 0.95


def test_skips_held_validators() -> None:
    cand = _cand(vote_pubkey="Held1")  # already held
    r = optimize([_pos()], [cand])
    assert r.moves == []


def test_avoids_shared_data_centers_when_alternatives_exist() -> None:
    pos = _pos(data_center="DC-A")
    same = _cand(vote_pubkey="C1", data_center="DC-A", composite_score=0.99)
    diff = _cand(vote_pubkey="C2", data_center="DC-Z", composite_score=0.95)
    r = optimize([pos], [same, diff])
    assert len(r.moves) == 1
    assert r.moves[0].to_voter_pubkey == "C2"  # different DC chosen even though score is lower


def test_falls_back_when_dc_filter_empties_pool() -> None:
    pos = _pos(data_center="DC-A")
    same = _cand(vote_pubkey="C1", data_center="DC-A", composite_score=0.99)
    r = optimize([pos], [same])
    # Falls back since otherwise no candidates remain
    assert len(r.moves) == 1
    assert r.moves[0].to_voter_pubkey == "C1"


def test_caps_moves_at_max_moves() -> None:
    positions = [_pos(voter_pubkey=f"H{i}", composite_score=0.3) for i in range(10)]
    candidates = [
        _cand(vote_pubkey=f"C{i}", data_center=f"DC-C{i}", composite_score=0.9)
        for i in range(10)
    ]
    r = optimize(positions, candidates, max_moves=3)
    assert len(r.moves) == 3


def test_downtime_objective_picks_lowest_downtime_candidate() -> None:
    pos = _pos(downtime_prob_7d=0.5)
    high = _cand(vote_pubkey="HighDt", downtime_prob_7d=0.4, data_center="DC-X")
    low = _cand(vote_pubkey="LowDt", downtime_prob_7d=0.05, data_center="DC-Y")
    r = optimize([pos], [high, low], objective="downtime")
    assert r.moves[0].to_voter_pubkey == "LowDt"


def test_well_aligned_portfolio_emits_note() -> None:
    pos = _pos(composite_score=0.95)
    cand = _cand(composite_score=0.96)
    r = optimize([pos], [cand], min_delta_per_move=0.10)
    assert r.moves == []
    assert any("well-aligned" in n for n in r.notes)
