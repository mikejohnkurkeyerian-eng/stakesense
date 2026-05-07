"""Daily digest email — HTML template + (deferred) Resend integration.

Pure function `render_digest` returns the email's `subject` + `html` so
callers can plug it into any provider (Resend, SES, Mailgun…).
The optional `send_via_resend` helper sends through https://resend.com
when `RESEND_API_KEY` is set; otherwise it returns a dry-run dict.
"""
from __future__ import annotations

import os
import urllib.error
import urllib.request
import json
from dataclasses import dataclass
from datetime import date
from typing import Any


@dataclass
class DigestPayload:
    subject: str
    html: str
    text: str


def _kind_emoji(kind: str) -> str:
    return {
        "mev_commission_change": "💸",
        "newly_delinquent": "🚨",
        "composite_drop": "📉",
        "composite_climb": "📈",
    }.get(kind, "•")


def _kind_label(kind: str) -> str:
    return {
        "mev_commission_change": "MEV change",
        "newly_delinquent": "Delinquent",
        "composite_drop": "Score drop",
        "composite_climb": "Score climb",
    }.get(kind, kind)


def _short_pk(pk: str) -> str:
    return f"{pk[:4]}…{pk[-4:]}"


def _row(d: dict[str, Any], site_url: str) -> str:
    name = d.get("name") or _short_pk(d["vote_pubkey"])
    pk = d["vote_pubkey"]
    link = f"{site_url.rstrip('/')}/validators/{pk}"
    badge = _kind_label(d.get("kind", ""))
    emoji = _kind_emoji(d.get("kind", ""))
    summary = d.get("summary") or ""
    return f"""
    <tr>
      <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;">
        <div style="font-size:14px;color:#0f172a;">
          <span style="display:inline-block;background:#f1f5f9;border-radius:4px;padding:2px 8px;font-size:11px;color:#334155;margin-right:8px;">{emoji} {badge}</span>
          <a href="{link}" style="color:#4c1d95;text-decoration:none;font-weight:600;">{name}</a>
        </div>
        <div style="font-size:13px;color:#475569;margin-top:4px;">{summary}</div>
      </td>
    </tr>"""


def render_digest(
    detections: list[dict[str, Any]],
    *,
    site_url: str,
    today: date | None = None,
    network_stats: dict[str, Any] | None = None,
) -> DigestPayload:
    today = today or date.today()
    title = f"stakesense daily digest — {today.isoformat()}"
    n = len(detections)
    headline = (
        f"{n} validator change{'s' if n != 1 else ''}"
        if n
        else "No notable validator changes since yesterday."
    )
    rows_html = "\n".join(_row(d, site_url) for d in detections[:20])
    stats_html = ""
    if network_stats:
        nk = network_stats.get("nakamoto_coefficient")
        active = network_stats.get("active_validators")
        avg_dt = network_stats.get("avg_downtime_prob")
        stats_html = f"""
        <p style="font-size:13px;color:#64748b;margin:0 0 16px 0;">
          Network snapshot: <strong>{active or '—'}</strong> active validators ·
          Nakamoto <strong>{nk if nk is not None else '—'}</strong> ·
          Avg downtime risk <strong>{(avg_dt * 100):.1f}%</strong>
        </p>""" if avg_dt is not None else ""

    html = f"""<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:24px 0;">
      <tr><td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:white;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
          <tr><td style="padding:24px 24px 0;">
            <div style="font-size:14px;color:#7c3aed;font-weight:700;letter-spacing:1px;text-transform:uppercase;">stakesense</div>
            <h1 style="font-size:24px;color:#0f172a;margin:8px 0 4px;">{headline}</h1>
            <p style="font-size:13px;color:#64748b;margin:0 0 16px 0;">{today.strftime('%A, %B %d, %Y')}</p>
            {stats_html}
          </td></tr>
          {f'<tr><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0">{rows_html}</table></td></tr>' if detections else ''}
          <tr><td style="padding:24px;">
            <a href="{site_url.rstrip('/')}/alerts" style="display:inline-block;background:#7c3aed;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">View all alerts →</a>
          </td></tr>
          <tr><td style="padding:0 24px 24px;border-top:1px solid #e2e8f0;padding-top:16px;">
            <p style="font-size:12px;color:#94a3b8;margin:0;">
              You&rsquo;re reading the stakesense daily digest. Open-source, public-goods scoring of every Solana validator.
              <br>Reply with feedback or unsubscribe by replying STOP.
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>"""

    text_lines = [headline, ""]
    for d in detections[:20]:
        name = d.get("name") or _short_pk(d["vote_pubkey"])
        text_lines.append(f"- [{_kind_label(d.get('kind', ''))}] {name}: {d.get('summary', '')}")
    text_lines.append("")
    text_lines.append(f"All alerts: {site_url.rstrip('/')}/alerts")
    text = "\n".join(text_lines)
    return DigestPayload(subject=title, html=html, text=text)


def send_via_resend(
    payload: DigestPayload,
    *,
    to: list[str],
    sender: str,
    api_key: str | None = None,
    timeout: float = 15.0,
) -> dict[str, Any]:
    """Send the digest via Resend. Returns the API response or a dry-run dict
    if no API key is available."""
    api_key = api_key or os.getenv("RESEND_API_KEY")
    if not api_key:
        return {"dry_run": True, "subject": payload.subject, "to": to}
    body = json.dumps(
        {
            "from": sender,
            "to": to,
            "subject": payload.subject,
            "html": payload.html,
            "text": payload.text,
        }
    ).encode("utf-8")
    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return {"error": str(e), "status": e.code}
