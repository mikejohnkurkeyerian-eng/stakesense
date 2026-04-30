"""Backfill epoch_performance from Solana RPC.

Combines:
  1. epochCredits from getVoteAccounts (last ~5 epochs of credits per validator)
  2. getBlockProduction for current epoch (skip rate)
  3. delinquent flag for current epoch (from getVoteAccounts)
"""
import asyncio

from stakesense.config import settings
from stakesense.db.epoch_repo import upsert_epoch_rows
from stakesense.sources.solana_history import (
    epoch_credit_rows_from_vote_accounts,
    merge_epoch_rows,
    skip_rate_rows_for_current_epoch,
)
from stakesense.sources.solana_rpc import SolanaRpcClient


async def main() -> None:
    rpc = SolanaRpcClient(rpc_url=settings.helius_rpc_url)

    epoch_info = await rpc.get_epoch_info()
    current_epoch = int(epoch_info["epoch"])
    print(f"current epoch: {current_epoch}")

    print("fetching getVoteAccounts...")
    records = await rpc.get_vote_accounts()
    print(f"  {len(records)} vote accounts")

    credit_rows = epoch_credit_rows_from_vote_accounts(records)
    print(f"  -> {len(credit_rows)} epoch-credit rows (across last ~5 epochs)")

    delinquent_rows = [
        {
            "vote_pubkey": r["vote_pubkey"],
            "epoch": current_epoch,
            "credits": None,
            "skip_rate": None,
            "vote_latency": None,
            "active_stake": int(r["active_stake"]) if r.get("active_stake") is not None else None,
            "delinquent": bool(r.get("delinquent")),
            "blocks_produced": None,
            "blocks_expected": None,
        }
        for r in records
    ]

    print("fetching getBlockProduction (current epoch)...")
    by_identity = await rpc.get_block_production_current()
    print(f"  {len(by_identity)} identities reported")

    identity_to_vote = {r["identity_pubkey"]: r["vote_pubkey"] for r in records}
    skip_rows = skip_rate_rows_for_current_epoch(by_identity, identity_to_vote, current_epoch)
    print(f"  -> {len(skip_rows)} skip-rate rows for epoch {current_epoch}")

    all_rows = merge_epoch_rows(credit_rows, delinquent_rows, skip_rows)
    print(f"merged: {len(all_rows)} unique (vote, epoch) rows")

    n = upsert_epoch_rows(all_rows)
    print(f"upserted {n} epoch_performance rows")


if __name__ == "__main__":
    asyncio.run(main())
