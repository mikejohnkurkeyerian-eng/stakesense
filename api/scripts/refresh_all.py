"""Top-level cron entrypoint. Refreshes validator list, recent epoch perf,
MEV snapshot, and (optionally) validators.app metadata."""
import asyncio
import time

from sqlalchemy import text

from stakesense.config import settings
from stakesense.db import SessionLocal
from stakesense.db.epoch_repo import upsert_epoch_rows
from stakesense.db.mev_repo import upsert_mev_rows
from stakesense.db.repository import upsert_validators
from stakesense.sources.jito import JitoClient
from stakesense.sources.solana_history import (
    epoch_credit_rows_from_vote_accounts,
    merge_epoch_rows,
    skip_rate_rows_for_current_epoch,
)
from stakesense.sources.solana_rpc import SolanaRpcClient
from stakesense.sources.validators_app import ValidatorsAppClient


METADATA_UPDATE_SQL = text(
    """
    UPDATE validators
       SET data_center = :data_center,
           asn         = :asn,
           country     = :country,
           name        = COALESCE(:name, name)
     WHERE vote_pubkey = :vote_pubkey
    """
)


async def main() -> None:
    t0 = time.time()
    rpc = SolanaRpcClient(rpc_url=settings.helius_rpc_url)
    j = JitoClient()

    # 1. validators
    records = await rpc.get_vote_accounts()
    n_v = upsert_validators(records)
    print(f"[{time.time()-t0:.1f}s] validators upserted: {n_v}")

    # 2. epoch_performance: epochCredits (last ~5 epochs) + current-epoch skip rates
    epoch_info = await rpc.get_epoch_info()
    current_epoch = int(epoch_info["epoch"])

    credit_rows = epoch_credit_rows_from_vote_accounts(records)
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
    by_identity = await rpc.get_block_production_current()
    identity_to_vote = {r["identity_pubkey"]: r["vote_pubkey"] for r in records}
    skip_rows = skip_rate_rows_for_current_epoch(by_identity, identity_to_vote, current_epoch)
    all_epoch_rows = merge_epoch_rows(credit_rows, delinquent_rows, skip_rows)
    n_e = upsert_epoch_rows(all_epoch_rows)
    print(f"[{time.time()-t0:.1f}s] epoch_performance rows upserted: {n_e}")

    # 3. MEV: current epoch snapshot
    mev_rows = await j.get_validator_mev(epoch=current_epoch - 1)
    n_m = upsert_mev_rows(mev_rows)
    print(f"[{time.time()-t0:.1f}s] MEV rows upserted: {n_m}")

    # 4. validators.app metadata (optional — needs token)
    if settings.validators_app_token:
        try:
            va = ValidatorsAppClient()
            va_rows = await va.get_all()
            payload = []
            for r in va_rows:
                vote = r.get("vote_account")
                if not vote:
                    continue
                payload.append({
                    "vote_pubkey": vote,
                    "data_center": (r.get("data_center_key") or "").strip() or None,
                    "asn": str(r.get("autonomous_system_number") or "") or None,
                    "country": (r.get("data_center_host") or r.get("country") or "").strip() or None,
                    "name": (r.get("name") or "").strip() or None,
                })
            if payload:
                with SessionLocal() as s, s.begin():
                    s.execute(METADATA_UPDATE_SQL, payload)
            print(f"[{time.time()-t0:.1f}s] validators.app metadata applied: {len(payload)}")
        except Exception as e:
            print(f"[{time.time()-t0:.1f}s] validators.app skipped (error): {e}")
    else:
        print(f"[{time.time()-t0:.1f}s] validators.app skipped (no token in .env)")

    print(f"refresh_all done in {time.time()-t0:.1f}s")


if __name__ == "__main__":
    asyncio.run(main())
