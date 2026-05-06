"""Read watch_subscriptions, fire webhooks for any triggered watches.

Run after each data refresh. Idempotency: a watch only fires again if
the metric crosses the threshold *after* the last_fired_at timestamp's
prediction_date — so a single sustained breach doesn't spam.

Usage:
    python -m scripts.dispatch_watch_alerts [--dry-run]

Reads DATABASE_URL via stakesense.config.settings.
"""
from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.request

from sqlalchemy import text

from stakesense.db import engine


COMPARATORS = {
    "lt": lambda a, b: a is not None and float(a) < float(b),
    "gt": lambda a, b: a is not None and float(a) > float(b),
}


def fetch_active_subs() -> list[dict]:
    sql = text(
        """
        SELECT id, vote_pubkey, webhook_url, webhook_kind, metric, comparator,
               threshold, label, last_fired_at
          FROM watch_subscriptions
         ORDER BY id ASC
        """
    )
    with engine.begin() as conn:
        return [dict(r) for r in conn.execute(sql).mappings()]


def latest_metric(vote_pubkey: str, metric: str) -> tuple[float | None, str | None]:
    sql = text(
        """
        SELECT prediction_date, %s AS value
          FROM predictions
         WHERE vote_pubkey = :pk
         ORDER BY prediction_date DESC
         LIMIT 1
        """
        % metric
    )
    with engine.begin() as conn:
        row = conn.execute(sql, {"pk": vote_pubkey}).mappings().fetchone()
    if not row:
        return None, None
    return (
        (float(row["value"]) if row["value"] is not None else None),
        str(row["prediction_date"]),
    )


def mark_fired(sub_id: int) -> None:
    sql = text("UPDATE watch_subscriptions SET last_fired_at = NOW() WHERE id = :id")
    with engine.begin() as conn:
        conn.execute(sql, {"id": sub_id})


def post(sub: dict, value: float, pred_date: str) -> None:
    label = sub.get("label") or sub["vote_pubkey"][:8] + "…"
    msg = (
        f"stakesense watch fired — {label}: "
        f"{sub['metric']} = {value:.3f} ({sub['comparator']} {sub['threshold']}, "
        f"prediction {pred_date})"
    )
    payload: dict
    if sub["webhook_kind"] == "slack":
        payload = {
            "blocks": [
                {
                    "type": "section",
                    "text": {"type": "mrkdwn", "text": f":bell: *{msg}*"},
                }
            ]
        }
    else:
        payload = {"content": f":bell: {msg}"}
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        sub["webhook_url"],
        data=data,
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            if resp.status >= 300:
                raise RuntimeError(f"webhook returned {resp.status}")
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"webhook rejected: HTTP {e.code}") from e


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args(argv)

    fired = 0
    for sub in fetch_active_subs():
        value, pred_date = latest_metric(sub["vote_pubkey"], sub["metric"])
        if value is None:
            continue
        cmp = COMPARATORS.get(sub["comparator"])
        if cmp is None:
            continue
        if not cmp(value, sub["threshold"]):
            continue
        last_fired = sub.get("last_fired_at")
        if last_fired is not None and pred_date is not None:
            if str(last_fired)[:10] >= pred_date:
                continue  # already fired for this prediction date
        if args.dry_run:
            print(
                f"[DRY-RUN] watch #{sub['id']} {sub['vote_pubkey'][:8]}… would fire: "
                f"{sub['metric']}={value:.3f} {sub['comparator']} {sub['threshold']}"
            )
            fired += 1
            continue
        try:
            post(sub, value, pred_date or "")
            mark_fired(int(sub["id"]))
            fired += 1
        except Exception as e:  # noqa: BLE001
            print(f"watch #{sub['id']} dispatch failed: {e}", file=sys.stderr)

    print(f"dispatch_watch_alerts: fired {fired} watch(es).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
