from typing import Iterable

from sqlalchemy import text

from stakesense.db import SessionLocal


UPSERT_SQL = text(
    """
    INSERT INTO epoch_performance (
        vote_pubkey, epoch, credits, skip_rate, vote_latency,
        active_stake, delinquent, blocks_produced, blocks_expected
    ) VALUES (
        :vote_pubkey, :epoch, :credits, :skip_rate, :vote_latency,
        :active_stake, :delinquent, :blocks_produced, :blocks_expected
    )
    ON CONFLICT (vote_pubkey, epoch) DO UPDATE SET
        credits = EXCLUDED.credits,
        skip_rate = EXCLUDED.skip_rate,
        vote_latency = EXCLUDED.vote_latency,
        active_stake = EXCLUDED.active_stake,
        delinquent = EXCLUDED.delinquent,
        blocks_produced = EXCLUDED.blocks_produced,
        blocks_expected = EXCLUDED.blocks_expected
    """
)


def upsert_epoch_rows(rows: Iterable[dict]) -> int:
    rows_list = [r for r in rows if r.get("vote_pubkey") and r.get("epoch") is not None]
    if not rows_list:
        return 0
    with SessionLocal() as session, session.begin():
        session.execute(UPSERT_SQL, rows_list)
    return len(rows_list)
