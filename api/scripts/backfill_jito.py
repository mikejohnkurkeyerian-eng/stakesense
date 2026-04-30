"""Backfill MEV observations.

The Jito public endpoint usually returns the current/last-N-epochs snapshot;
for deeper history, check Jito's GraphQL API or scrape the Steward dashboard.
Day 2 scope: capture latest completed epoch only.
"""
import asyncio

from stakesense.config import settings
from stakesense.db.mev_repo import upsert_mev_rows
from stakesense.sources.jito import JitoClient
from stakesense.sources.solana_rpc import SolanaRpcClient


async def main() -> None:
    rpc = SolanaRpcClient(rpc_url=settings.helius_rpc_url)
    epoch_info = await rpc._post(
        {"jsonrpc": "2.0", "id": 1, "method": "getEpochInfo", "params": []}
    )
    epoch = epoch_info["result"]["epoch"] - 1  # last completed
    print(f"backfilling MEV for epoch {epoch}")

    j = JitoClient()
    rows = await j.get_validator_mev(epoch=epoch)
    n = upsert_mev_rows(rows)
    print(f"upserted {n} MEV rows for epoch {epoch}")


if __name__ == "__main__":
    asyncio.run(main())
