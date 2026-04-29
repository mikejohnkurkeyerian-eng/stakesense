import json

import httpx
import pytest
import respx

from stakesense.sources.solana_rpc import SolanaRpcClient


@pytest.mark.asyncio
async def test_get_vote_accounts_returns_normalized_records(fixture_dir):
    fixture = json.loads((fixture_dir / "get_vote_accounts_sample.json").read_text())

    with respx.mock(base_url="https://test.example") as mock:
        mock.post("/").mock(return_value=httpx.Response(200, json=fixture))
        client = SolanaRpcClient(rpc_url="https://test.example/")
        records = await client.get_vote_accounts()

    # 5 current + 2 delinquent (from fixture trimming)
    assert len(records) == 7
    sample = records[0]
    assert "vote_pubkey" in sample
    assert "identity_pubkey" in sample
    assert "commission_pct" in sample
    assert "active_stake" in sample
    assert "delinquent" in sample
    assert isinstance(sample["delinquent"], bool)
    delinquent_count = sum(1 for r in records if r["delinquent"])
    assert delinquent_count == 2
