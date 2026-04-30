import pytest
from sqlalchemy import text

from stakesense.db import engine
from stakesense.db.repository import upsert_validators


TEST_VOTE_PK = "TEST_FIXTURE_Vote111_DO_NOT_USE_AS_REAL"


@pytest.fixture(autouse=True)
def clean_test_row():
    """Delete only our sentinel row, never touch real validators."""
    with engine.begin() as conn:
        conn.execute(text("DELETE FROM validators WHERE vote_pubkey = :pk"), {"pk": TEST_VOTE_PK})
    yield
    with engine.begin() as conn:
        conn.execute(text("DELETE FROM validators WHERE vote_pubkey = :pk"), {"pk": TEST_VOTE_PK})


def test_upsert_inserts_then_updates():
    rec = {
        "vote_pubkey": TEST_VOTE_PK,
        "identity_pubkey": "Id111",
        "commission_pct": 7,
        "active_stake": 1_000_000_000,
    }
    assert upsert_validators([rec]) == 1

    with engine.begin() as conn:
        row = conn.execute(
            text("SELECT vote_pubkey, commission_pct FROM validators WHERE vote_pubkey = :pk"),
            {"pk": TEST_VOTE_PK},
        ).one()
    assert row == (TEST_VOTE_PK, 7)

    rec["commission_pct"] = 9
    upsert_validators([rec])
    with engine.begin() as conn:
        row = conn.execute(
            text("SELECT commission_pct FROM validators WHERE vote_pubkey = :pk"),
            {"pk": TEST_VOTE_PK},
        ).one()
    assert row == (9,)
