"""One-off: re-parse country from data_center column.

Earlier ingest mistakenly stored validators.app's `data_center_host` (reverse-DNS
hostname) into the `country` column. The correct source is the 2-letter ISO code
embedded in `data_center_key`, e.g. "20326-NL-Amsterdam" -> "NL".

Run once after pulling the fix; subsequent refresh_all.py runs will keep it correct.
"""
from sqlalchemy import text

from stakesense.db import SessionLocal


SQL = text(
    """
    UPDATE validators
       SET country = CASE
           WHEN data_center IS NULL THEN NULL
           WHEN split_part(data_center, '-', 2) ~ '^[A-Za-z]{2}$'
                THEN UPPER(split_part(data_center, '-', 2))
           ELSE NULL
       END
    """
)


def main() -> None:
    with SessionLocal() as s, s.begin():
        result = s.execute(SQL)
    print(f"updated rows: {result.rowcount}")


if __name__ == "__main__":
    main()
