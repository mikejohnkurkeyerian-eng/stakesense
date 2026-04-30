"""Enrich validators table with data_center, ASN, country from validators.app."""
import asyncio

from sqlalchemy import text

from stakesense.db import SessionLocal
from stakesense.sources.validators_app import ValidatorsAppClient


UPDATE_SQL = text(
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
    client = ValidatorsAppClient()
    rows = await client.get_all()
    print(f"fetched {len(rows)} validators.app rows")

    payload = []
    for r in rows:
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

    with SessionLocal() as s, s.begin():
        s.execute(UPDATE_SQL, payload)
    print(f"updated metadata on {len(payload)} validators")


if __name__ == "__main__":
    asyncio.run(main())
