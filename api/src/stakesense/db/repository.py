from datetime import datetime, timezone
from typing import Iterable

from sqlalchemy.dialects.postgresql import insert

from stakesense.db import SessionLocal
from stakesense.db.models import Validator


def upsert_validators(records: Iterable[dict]) -> int:
    rows = []
    now = datetime.now(timezone.utc)
    for r in records:
        rows.append({
            "vote_pubkey": r["vote_pubkey"],
            "identity_pubkey": r.get("identity_pubkey"),
            "commission_pct": r.get("commission_pct"),
            "active_stake": r.get("active_stake"),
            "last_updated": now,
        })
    if not rows:
        return 0
    stmt = insert(Validator).values(rows)
    stmt = stmt.on_conflict_do_update(
        index_elements=[Validator.vote_pubkey],
        set_={
            "identity_pubkey": stmt.excluded.identity_pubkey,
            "commission_pct": stmt.excluded.commission_pct,
            "active_stake": stmt.excluded.active_stake,
            "last_updated": stmt.excluded.last_updated,
        },
    )
    with SessionLocal() as session, session.begin():
        session.execute(stmt)
    return len(rows)
