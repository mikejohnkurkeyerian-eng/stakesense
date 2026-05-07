"""Render and (optionally) send the stakesense daily digest email.

Usage:
    STAKESENSE_API_BASE=https://stakesense.onrender.com \\
    DIGEST_RECIPIENTS=ops@example.com,you@example.com \\
    DIGEST_SENDER="stakesense <digest@stakesense.app>" \\
    RESEND_API_KEY=re_... \\
    python -m scripts.send_daily_digest [--dry-run] [--limit 10]

Without RESEND_API_KEY the script renders the email and prints subject + body
to stdout. Designed for daily cron (e.g. 09:00 UTC) after the refresh job.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.request
from typing import Any

from stakesense.digest import render_digest, send_via_resend


def fetch_json(url: str) -> Any:
    req = urllib.request.Request(url, headers={"User-Agent": "stakesense-digest"})
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read().decode("utf-8"))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=10)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument(
        "--site-url",
        default=os.getenv(
            "STAKESENSE_SITE_URL",
            "https://stakesense-el77-git-main-california-mortgage-solutions.vercel.app",
        ),
    )
    args = parser.parse_args()

    api_base = os.getenv("STAKESENSE_API_BASE", "https://stakesense.onrender.com")
    recipients = [
        a.strip()
        for a in os.getenv("DIGEST_RECIPIENTS", "").split(",")
        if a.strip()
    ]
    sender = os.getenv("DIGEST_SENDER", "stakesense <digest@stakesense.app>")

    detections = fetch_json(
        f"{api_base.rstrip('/')}/api/v1/anomalies?limit={args.limit}"
    ).get("detections", [])
    try:
        stats = fetch_json(f"{api_base.rstrip('/')}/api/v1/validators/stats")
    except Exception:
        stats = None

    payload = render_digest(
        detections,
        site_url=args.site_url,
        network_stats=stats,
    )

    if args.dry_run or not recipients or not os.getenv("RESEND_API_KEY"):
        print(f"Subject: {payload.subject}")
        print(f"To: {recipients or '<no recipients>'}")
        print(f"Detections: {len(detections)}")
        if args.dry_run:
            print("--- TEXT ---")
            print(payload.text)
        return 0

    result = send_via_resend(payload, to=recipients, sender=sender)
    print(json.dumps(result))
    return 0


if __name__ == "__main__":
    sys.exit(main())
