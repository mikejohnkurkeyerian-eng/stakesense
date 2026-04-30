"""Pull current vote accounts from Solana RPC and upsert into Supabase."""
import asyncio

from stakesense.config import settings
from stakesense.db.repository import upsert_validators
from stakesense.sources.solana_rpc import SolanaRpcClient


async def main() -> None:
    client = SolanaRpcClient(rpc_url=settings.helius_rpc_url)
    records = await client.get_vote_accounts()
    n = upsert_validators(records)
    print(f"upserted {n} validators")


if __name__ == "__main__":
    asyncio.run(main())
