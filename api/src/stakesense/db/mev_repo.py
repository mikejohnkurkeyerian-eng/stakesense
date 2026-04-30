from typing import Iterable

from sqlalchemy import text

from stakesense.db import SessionLocal


UPSERT_SQL = text(
    """
    INSERT INTO mev_observations (
        vote_pubkey, epoch, mev_revenue_lamports, mev_commission_pct, mev_to_delegators_lamports
    ) VALUES (
        :vote_pubkey, :epoch, :mev_revenue_lamports, :mev_commission_pct, :mev_to_delegators_lamports
    )
    ON CONFLICT (vote_pubkey, epoch) DO UPDATE SET
        mev_revenue_lamports = EXCLUDED.mev_revenue_lamports,
        mev_commission_pct = EXCLUDED.mev_commission_pct,
        mev_to_delegators_lamports = EXCLUDED.mev_to_delegators_lamports
    """
)


def upsert_mev_rows(rows: Iterable[dict]) -> int:
    rows_list = [r for r in rows if r.get("vote_pubkey")]
    if not rows_list:
        return 0
    with SessionLocal() as session, session.begin():
        session.execute(UPSERT_SQL, rows_list)
    return len(rows_list)
