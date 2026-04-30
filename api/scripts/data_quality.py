"""Quick data-quality sanity check; run after each refresh."""
from sqlalchemy import text

from stakesense.db import engine


CHECKS = [
    ("validator_count", "SELECT COUNT(*) FROM validators"),
    ("epoch_row_count", "SELECT COUNT(*) FROM epoch_performance"),
    ("epoch_range", "SELECT MIN(epoch), MAX(epoch) FROM epoch_performance"),
    ("mev_row_count", "SELECT COUNT(*) FROM mev_observations"),
    ("validators_with_metadata", "SELECT COUNT(*) FROM validators WHERE data_center IS NOT NULL"),
    (
        "delinquent_share",
        "SELECT 1.0 * SUM(CASE WHEN delinquent THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0) "
        "FROM epoch_performance WHERE epoch = (SELECT MAX(epoch) FROM epoch_performance)",
    ),
]


def main() -> None:
    with engine.begin() as conn:
        for label, sql in CHECKS:
            row = conn.execute(text(sql)).fetchone()
            print(f"  {label}: {row}")


if __name__ == "__main__":
    main()
