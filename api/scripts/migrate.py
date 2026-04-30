"""Apply schema.sql against the configured DATABASE_URL."""
import sys
from pathlib import Path

import psycopg2

from stakesense.config import settings


def main() -> None:
    sql = Path(__file__).parent.joinpath("schema.sql").read_text()
    conn = psycopg2.connect(settings.database_url)
    try:
        with conn, conn.cursor() as cur:
            cur.execute(sql)
        print("schema applied")
    finally:
        conn.close()


if __name__ == "__main__":
    sys.exit(main())
