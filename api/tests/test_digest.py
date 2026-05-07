"""Tests for the daily digest email renderer."""
from __future__ import annotations

from datetime import date

from stakesense.digest import render_digest


SITE = "https://stakesense.app"


def test_render_digest_no_detections() -> None:
    p = render_digest([], site_url=SITE, today=date(2026, 5, 6))
    assert "No notable validator changes" in p.text
    assert "No notable validator changes" in p.html
    assert "2026-05-06" in p.subject


def test_render_digest_with_detections_includes_link_and_summary() -> None:
    detections = [
        {
            "kind": "newly_delinquent",
            "vote_pubkey": "Vote111111111111111111111111111111111",
            "name": "Acme Validator",
            "summary": "Was healthy yesterday; delinquent in latest snapshot.",
        },
        {
            "kind": "composite_drop",
            "vote_pubkey": "Vote222222222222222222222222222222222",
            "name": None,
            "summary": "Composite -0.08 over 1d",
        },
    ]
    p = render_digest(detections, site_url=SITE, today=date(2026, 5, 6))
    assert "Acme Validator" in p.html
    assert "Vote2222" in p.html  # short pk fallback
    assert "/validators/Vote111" in p.html
    assert "delinquent" in p.text.lower()
    assert p.subject.startswith("stakesense daily digest")


def test_render_digest_includes_network_stats_when_provided() -> None:
    stats = {
        "active_validators": 800,
        "nakamoto_coefficient": 21,
        "avg_downtime_prob": 0.087,
    }
    p = render_digest([], site_url=SITE, network_stats=stats, today=date(2026, 5, 6))
    assert "800" in p.html
    assert "21" in p.html
    assert "8.7%" in p.html


def test_render_digest_truncates_long_lists() -> None:
    detections = [
        {
            "kind": "composite_drop",
            "vote_pubkey": f"Vote{i:039d}",
            "name": f"V{i}",
            "summary": "x",
        }
        for i in range(50)
    ]
    p = render_digest(detections, site_url=SITE, today=date(2026, 5, 6))
    # Capped at 20 detection rows. Detection rows are uniquely identified
    # by the "border-bottom" cell style; layout rows don't have it.
    assert p.html.count("border-bottom:1px solid #e5e7eb") == 20
    # Text version is similarly bounded.
    assert p.text.count("- [") == 20
