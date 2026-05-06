"""Post recent stakesense anomalies to a Discord channel.

Usage:
    DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...  \
    STAKESENSE_API_BASE=https://stakesense-api.onrender.com   \
    python -m scripts.post_anomalies_to_discord [--limit 5] [--dry-run]

Designed for cron (e.g. once per day after the data refresh). Idempotent
across runs only as long as the upstream anomalies endpoint stops surfacing
old detections — which is the current behavior since it always reports the
latest two observations per validator.

If your channel doesn't expect frequent posts, run with `--dry-run` first
to preview the message.
"""
from __future__ import annotations

import argparse
import os
import sys
import urllib.error
import urllib.request
import json
from typing import Any


def _kind_emoji(kind: str) -> str:
    return {
        "mev_commission_change": "💸",
        "newly_delinquent": "🚨",
        "composite_drop": "📉",
        "composite_climb": "📈",
    }.get(kind, "•")


def _format_detection(d: dict[str, Any], explorer_base: str) -> str:
    name = d.get("name") or d["vote_pubkey"][:8] + "…"
    pk = d["vote_pubkey"]
    link = f"{explorer_base.rstrip('/')}/validators/{pk}"
    return f"{_kind_emoji(d['kind'])} **{name}** — {d['summary']}\n<{link}>"


def fetch_detections(api_base: str, limit: int) -> list[dict[str, Any]]:
    url = f"{api_base.rstrip('/')}/api/v1/anomalies?limit={limit}"
    req = urllib.request.Request(url, headers={"User-Agent": "stakesense-discord-bot"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        body = json.loads(resp.read().decode("utf-8"))
    return body.get("detections", [])


def build_message(detections: list[dict[str, Any]], explorer_base: str) -> str:
    if not detections:
        return "stakesense: no notable validator changes since the last refresh. ✅"
    header = f"**stakesense — {len(detections)} validator change{'s' if len(detections) > 1 else ''}**"
    lines = [_format_detection(d, explorer_base) for d in detections]
    return header + "\n\n" + "\n\n".join(lines)


def post_to_discord(webhook_url: str, content: str) -> None:
    # Discord caps messages at 2000 chars; truncate just in case.
    if len(content) > 1900:
        content = content[:1880] + "\n…(truncated)"
    payload = json.dumps({"content": content}).encode("utf-8")
    req = urllib.request.Request(
        webhook_url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            if resp.status >= 300:
                raise RuntimeError(f"Discord returned {resp.status}")
    except urllib.error.HTTPError as e:
        raise RuntimeError(
            f"Discord webhook rejected message: HTTP {e.code} — {e.read().decode('utf-8', 'ignore')}"
        ) from e


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int, default=5, help="Max detections to post (default 5)")
    parser.add_argument("--dry-run", action="store_true", help="Print the message instead of posting")
    parser.add_argument(
        "--api-base",
        default=os.environ.get("STAKESENSE_API_BASE", "https://stakesense.onrender.com"),
        help="stakesense API base URL",
    )
    parser.add_argument(
        "--explorer-base",
        default=os.environ.get(
            "STAKESENSE_WEB_BASE",
            "https://stakesense-el77-git-main-california-mortgage-solutions.vercel.app",
        ),
        help="Public stakesense web base URL (used for validator links in posts)",
    )
    args = parser.parse_args(argv)

    detections = fetch_detections(args.api_base, args.limit)
    message = build_message(detections, args.explorer_base)

    if args.dry_run:
        try:
            print(message)
        except UnicodeEncodeError:
            # Some Windows terminals can't render emoji — fall back gracefully
            sys.stdout.buffer.write(message.encode("utf-8", "replace") + b"\n")
        return 0

    webhook = os.environ.get("DISCORD_WEBHOOK_URL")
    if not webhook:
        print(
            "ERROR: DISCORD_WEBHOOK_URL is not set. Re-run with --dry-run to preview, "
            "or set the env var to post.",
            file=sys.stderr,
        )
        return 2
    post_to_discord(webhook, message)
    print(f"Posted {len(detections)} detection(s) to Discord.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
