"""Post recent stakesense anomalies to a Slack channel via Incoming Webhook.

Usage:
    SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...   \
    STAKESENSE_API_BASE=https://stakesense.onrender.com      \
    python -m scripts.post_anomalies_to_slack [--limit 5] [--dry-run]

Designed for cron after each data refresh.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from typing import Any


def _kind_emoji(kind: str) -> str:
    return {
        "mev_commission_change": ":money_with_wings:",
        "newly_delinquent": ":rotating_light:",
        "composite_drop": ":chart_with_downwards_trend:",
        "composite_climb": ":chart_with_upwards_trend:",
    }.get(kind, ":small_blue_diamond:")


def fetch_detections(api_base: str, limit: int) -> list[dict[str, Any]]:
    url = f"{api_base.rstrip('/')}/api/v1/anomalies?limit={limit}"
    req = urllib.request.Request(url, headers={"User-Agent": "stakesense-slack-bot"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        body = json.loads(resp.read().decode("utf-8"))
    return body.get("detections", [])


def build_blocks(detections: list[dict[str, Any]], explorer_base: str) -> list[dict[str, Any]]:
    if not detections:
        return [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": ":white_check_mark: *stakesense:* no notable validator changes since the last refresh.",
                },
            }
        ]
    blocks: list[dict[str, Any]] = [
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": f"stakesense — {len(detections)} validator change"
                + ("s" if len(detections) > 1 else ""),
            },
        }
    ]
    for d in detections:
        name = d.get("name") or d["vote_pubkey"][:8] + "…"
        link = f"{explorer_base.rstrip('/')}/validators/{d['vote_pubkey']}"
        blocks.append(
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"{_kind_emoji(d['kind'])} *<{link}|{name}>* — {d['summary']}",
                },
            }
        )
    blocks.append(
        {
            "type": "context",
            "elements": [
                {
                    "type": "mrkdwn",
                    "text": "Powered by <https://github.com/mikejohnkurkeyerian-eng/stakesense|stakesense> · CC-BY 4.0",
                }
            ],
        }
    )
    return blocks


def post_to_slack(webhook_url: str, blocks: list[dict[str, Any]]) -> None:
    payload = json.dumps({"blocks": blocks}).encode("utf-8")
    req = urllib.request.Request(
        webhook_url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            if resp.status >= 300:
                raise RuntimeError(f"Slack returned {resp.status}")
    except urllib.error.HTTPError as e:
        raise RuntimeError(
            f"Slack rejected: HTTP {e.code} — {e.read().decode('utf-8', 'ignore')}"
        ) from e


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int, default=5)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument(
        "--api-base",
        default=os.environ.get("STAKESENSE_API_BASE", "https://stakesense.onrender.com"),
    )
    parser.add_argument(
        "--explorer-base",
        default=os.environ.get(
            "STAKESENSE_WEB_BASE",
            "https://stakesense-el77-git-main-california-mortgage-solutions.vercel.app",
        ),
    )
    args = parser.parse_args(argv)

    detections = fetch_detections(args.api_base, args.limit)
    blocks = build_blocks(detections, args.explorer_base)

    if args.dry_run:
        try:
            print(json.dumps({"blocks": blocks}, indent=2))
        except UnicodeEncodeError:
            sys.stdout.buffer.write(
                json.dumps({"blocks": blocks}, indent=2).encode("utf-8", "replace") + b"\n"
            )
        return 0

    webhook = os.environ.get("SLACK_WEBHOOK_URL")
    if not webhook:
        print("ERROR: SLACK_WEBHOOK_URL not set. Re-run with --dry-run.", file=sys.stderr)
        return 2
    post_to_slack(webhook, blocks)
    print(f"Posted {len(detections)} detection(s) to Slack.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
