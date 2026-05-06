"""Tests for the Slack anomaly poster (formatting only)."""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
sys.path.insert(0, str(SCRIPTS))

import post_anomalies_to_slack as pas  # noqa: E402


def test_blocks_for_no_detections() -> None:
    blocks = pas.build_blocks([], "https://e.com")
    assert any(":white_check_mark:" in str(b) for b in blocks)


def test_blocks_include_validator_link() -> None:
    detections = [
        {
            "kind": "newly_delinquent",
            "vote_pubkey": "x" * 40,
            "name": "Validator X",
            "magnitude": 1.0,
            "summary": "Became delinquent in epoch 1000",
        }
    ]
    blocks = pas.build_blocks(detections, "https://stakesense.example")
    flat = str(blocks)
    assert "Validator X" in flat
    assert "https://stakesense.example/validators/" in flat
    # Header appears for any non-empty detections list
    assert any(b.get("type") == "header" for b in blocks)


def test_kind_emoji_known_kinds() -> None:
    assert pas._kind_emoji("newly_delinquent") == ":rotating_light:"
    assert pas._kind_emoji("composite_drop") == ":chart_with_downwards_trend:"
    assert pas._kind_emoji("composite_climb") == ":chart_with_upwards_trend:"
    assert pas._kind_emoji("unknown") == ":small_blue_diamond:"


def test_blocks_singular_vs_plural_header() -> None:
    one = pas.build_blocks(
        [{"kind": "newly_delinquent", "vote_pubkey": "x" * 32, "name": "A", "magnitude": 1.0, "summary": "t"}],
        "https://e.com",
    )
    two = pas.build_blocks(
        [
            {"kind": "newly_delinquent", "vote_pubkey": "x" * 32, "name": "A", "magnitude": 1.0, "summary": "t"},
            {"kind": "newly_delinquent", "vote_pubkey": "y" * 32, "name": "B", "magnitude": 1.0, "summary": "t"},
        ],
        "https://e.com",
    )
    one_header = next(b for b in one if b.get("type") == "header")
    two_header = next(b for b in two if b.get("type") == "header")
    assert "1 validator change" in one_header["text"]["text"]
    assert "2 validator changes" in two_header["text"]["text"]
