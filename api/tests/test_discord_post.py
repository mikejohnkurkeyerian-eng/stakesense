"""Tests for the Discord anomaly poster (formatting + dry-run only).

We do NOT exercise the network in tests. Real webhook posts are
verified by the operator running the script with --dry-run first.
"""
from __future__ import annotations

import sys
from pathlib import Path

# Add the scripts/ folder to sys.path so the module can be imported in tests
ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
sys.path.insert(0, str(SCRIPTS))

import post_anomalies_to_discord as pad  # noqa: E402


def test_build_message_for_no_detections() -> None:
    msg = pad.build_message([], "https://example.com")
    assert "no notable" in msg.lower()


def test_build_message_includes_validator_link() -> None:
    detections = [
        {
            "kind": "mev_commission_change",
            "vote_pubkey": "AbCdEf12345678" + "x" * 30,
            "name": "TestValidator",
            "magnitude": 7.5,
            "summary": "MEV commission moved up 7.5 pp (epoch 800 → 801, 2.5% → 10.0%)",
            "epoch": 801,
        }
    ]
    msg = pad.build_message(detections, "https://stakesense.example")
    assert "TestValidator" in msg
    assert "https://stakesense.example/validators/AbCdEf12345678" in msg
    assert "MEV commission" in msg


def test_kind_emoji_known_kinds() -> None:
    assert pad._kind_emoji("newly_delinquent") == "🚨"
    assert pad._kind_emoji("composite_drop") == "📉"
    assert pad._kind_emoji("composite_climb") == "📈"
    # Unknown kind gracefully falls back
    assert pad._kind_emoji("mystery") == "•"


def test_build_message_singular_vs_plural_header() -> None:
    one = pad.build_message(
        [{"kind": "newly_delinquent", "vote_pubkey": "x" * 32, "name": "A", "magnitude": 1.0, "summary": "test"}],
        "https://e.com",
    )
    two = pad.build_message(
        [
            {"kind": "newly_delinquent", "vote_pubkey": "x" * 32, "name": "A", "magnitude": 1.0, "summary": "test"},
            {"kind": "newly_delinquent", "vote_pubkey": "y" * 32, "name": "B", "magnitude": 1.0, "summary": "test"},
        ],
        "https://e.com",
    )
    assert "1 validator change" in one
    assert "2 validator changes" in two
