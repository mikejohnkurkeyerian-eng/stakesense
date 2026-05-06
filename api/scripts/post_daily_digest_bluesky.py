"""Post a daily stakesense digest to Bluesky via the AT Protocol.

Bluesky was chosen over Twitter because:
- It's free and open (matches the public-goods ethos of stakesense).
- App passwords are easy for humans to provision; no developer-account drama.

Usage:
    BSKY_HANDLE=you.bsky.social  \
    BSKY_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx  \
    python -m scripts.post_daily_digest_bluesky [--dry-run]

The post is intentionally short (≤300 chars) so it always fits.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from typing import Any


def fetch_stats(api_base: str) -> dict[str, Any]:
    url = f"{api_base.rstrip('/')}/api/v1/validators/stats"
    req = urllib.request.Request(url, headers={"User-Agent": "stakesense-bsky-bot"})
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read().decode("utf-8"))


def fetch_top_anomaly(api_base: str) -> dict[str, Any] | None:
    url = f"{api_base.rstrip('/')}/api/v1/anomalies?limit=1"
    req = urllib.request.Request(url, headers={"User-Agent": "stakesense-bsky-bot"})
    with urllib.request.urlopen(req, timeout=15) as r:
        body = json.loads(r.read().decode("utf-8"))
    detections = body.get("detections", [])
    return detections[0] if detections else None


def build_post(stats: dict[str, Any], anomaly: dict[str, Any] | None, web_base: str) -> str:
    nakamoto = stats.get("nakamoto_coefficient")
    epoch = stats.get("latest_epoch")
    n = stats.get("active_validators")
    avg_comp = stats.get("avg_composite")
    head = (
        f"📊 stakesense daily — epoch {epoch} · "
        f"Nakamoto {nakamoto if nakamoto is not None else '?'} · "
        f"{n} validators · avg composite {avg_comp:.2f}"
        if avg_comp is not None
        else f"📊 stakesense daily — epoch {epoch} · Nakamoto {nakamoto if nakamoto is not None else '?'} · {n} validators"
    )
    parts = [head]
    if anomaly is not None:
        parts.append(f"Top mover: {anomaly.get('summary', '')[:140]}")
    parts.append(web_base.rstrip("/"))
    text = "\n\n".join(parts)
    return text[:300]


def authenticate(handle: str, password: str) -> tuple[str, str]:
    """Returns (access_jwt, did)."""
    data = json.dumps({"identifier": handle, "password": password}).encode()
    req = urllib.request.Request(
        "https://bsky.social/xrpc/com.atproto.server.createSession",
        data=data,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=15) as r:
        body = json.loads(r.read().decode("utf-8"))
    return body["accessJwt"], body["did"]


def post_record(jwt: str, did: str, text: str) -> str:
    record = {
        "$type": "app.bsky.feed.post",
        "text": text,
        "createdAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    }
    data = json.dumps(
        {
            "repo": did,
            "collection": "app.bsky.feed.post",
            "record": record,
        }
    ).encode()
    req = urllib.request.Request(
        "https://bsky.social/xrpc/com.atproto.repo.createRecord",
        data=data,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {jwt}",
        },
    )
    with urllib.request.urlopen(req, timeout=15) as r:
        body = json.loads(r.read().decode("utf-8"))
    return body.get("uri", "")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument(
        "--api-base",
        default=os.environ.get("STAKESENSE_API_BASE", "https://stakesense.onrender.com"),
    )
    parser.add_argument(
        "--web-base",
        default=os.environ.get(
            "STAKESENSE_WEB_BASE",
            "https://stakesense-el77-git-main-california-mortgage-solutions.vercel.app",
        ),
    )
    args = parser.parse_args(argv)

    stats = fetch_stats(args.api_base)
    anomaly = fetch_top_anomaly(args.api_base)
    text = build_post(stats, anomaly, args.web_base)

    if args.dry_run:
        try:
            print(text)
        except UnicodeEncodeError:
            sys.stdout.buffer.write(text.encode("utf-8", "replace") + b"\n")
        return 0

    handle = os.environ.get("BSKY_HANDLE")
    pw = os.environ.get("BSKY_APP_PASSWORD")
    if not handle or not pw:
        print("ERROR: set BSKY_HANDLE + BSKY_APP_PASSWORD or use --dry-run.", file=sys.stderr)
        return 2
    try:
        jwt, did = authenticate(handle, pw)
        uri = post_record(jwt, did, text)
        print(f"Posted: {uri}")
        return 0
    except urllib.error.HTTPError as e:
        print(f"Bluesky rejected: HTTP {e.code} — {e.read().decode('utf-8', 'ignore')}", file=sys.stderr)
        return 3


if __name__ == "__main__":
    raise SystemExit(main())
