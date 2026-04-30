"""Build epoch_performance rows from Solana RPC + (optional) Stakewiz stake history.

Why this exists:
  - Stakewiz dropped per-epoch performance endpoints; we can't get historical
    skip_rate / credits / delinquent from them anymore.
  - getBlockProduction is capped at 5000-slot ranges by Helius (epochs are 432K
    slots). So we only fetch *current epoch* skip rates.
  - getVoteAccounts.epochCredits gives us the last ~5 epochs of credits per
    validator for free. Each daily refresh extends this window.

Combined approach: epochCredits → 5 historical epochs of credits, getBlockProduction
→ current epoch skip rates. Stakewiz /validator_total_stakes/{vote} → historical
active_stake (still works).
"""
from typing import Any


def epoch_credit_rows_from_vote_accounts(
    records: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Convert getVoteAccounts records into per-epoch rows.

    Each `epoch_credits` entry is `[epoch, total_credits, prev_epoch_total]`.
    The credits earned *in* that epoch = total_credits - prev_epoch_total.
    """
    out: list[dict[str, Any]] = []
    for rec in records:
        vote = rec["vote_pubkey"]
        for entry in rec.get("epoch_credits") or []:
            if not isinstance(entry, (list, tuple)) or len(entry) < 3:
                continue
            epoch, total, prev = entry[0], entry[1], entry[2]
            credits_in_epoch = max(int(total) - int(prev), 0)
            out.append({
                "vote_pubkey": vote,
                "epoch": int(epoch),
                "credits": credits_in_epoch,
                "skip_rate": None,
                "vote_latency": None,
                "active_stake": None,
                "delinquent": None,
                "blocks_produced": None,
                "blocks_expected": None,
            })
    return out


def skip_rate_rows_for_current_epoch(
    by_identity: dict[str, list[int]],
    identity_to_vote: dict[str, str],
    current_epoch: int,
) -> list[dict[str, Any]]:
    """Convert getBlockProduction.byIdentity into per-validator skip-rate rows."""
    out: list[dict[str, Any]] = []
    for identity, (leader_slots, blocks_produced) in by_identity.items():
        vote = identity_to_vote.get(identity)
        if vote is None:
            continue
        if leader_slots == 0:
            skip_rate = None
        else:
            skip_rate = max(0.0, 1.0 - blocks_produced / leader_slots)
        out.append({
            "vote_pubkey": vote,
            "epoch": current_epoch,
            "credits": None,
            "skip_rate": skip_rate,
            "vote_latency": None,
            "active_stake": None,
            "delinquent": None,
            "blocks_produced": int(blocks_produced),
            "blocks_expected": int(leader_slots),
        })
    return out


def merge_epoch_rows(
    *row_lists: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Merge multiple per-(vote, epoch) row lists by overlaying non-None fields.

    Later lists override earlier ones for non-None fields."""
    by_key: dict[tuple, dict[str, Any]] = {}
    for rows in row_lists:
        for r in rows:
            key = (r["vote_pubkey"], r["epoch"])
            if key not in by_key:
                by_key[key] = {k: v for k, v in r.items()}
            else:
                for k, v in r.items():
                    if v is not None:
                        by_key[key][k] = v
    return list(by_key.values())
