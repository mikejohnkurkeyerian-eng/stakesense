import pytest
from sqlalchemy import text

from stakesense.db import SessionLocal, engine
from stakesense.db.repository import upsert_validators


@pytest.fixture(autouse=True)
def clean_validators():
    with SessionLocal() as s, s.begin():
        s.execute(text("TRUNCATE validators CASCADE"))
    yield


def test_upsert_inserts_then_updates():
    rec = {
        "vote_pubkey": "Vote111",
        "identity_pubkey": "Id111",
        "commission_pct": 7,
        "active_stake": 1_000_000_000,
    }
    assert upsert_validators([rec]) == 1

    with engine.begin() as conn:
        rows = list(conn.execute(text("SELECT vote_pubkey, commission_pct FROM validators")))
    assert rows == [("Vote111", 7)]

    rec["commission_pct"] = 9
    upsert_validators([rec])
    with engine.begin() as conn:
        rows = list(conn.execute(text("SELECT commission_pct FROM validators")))
    assert rows == [(9,)]
