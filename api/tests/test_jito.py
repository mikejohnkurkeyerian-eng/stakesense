import json

import httpx
import pytest
import respx

from stakesense.sources.jito import JitoClient


@pytest.mark.asyncio
async def test_get_validator_mev_normalizes(fixture_dir):
    fixture = json.loads((fixture_dir / "jito_validators.json").read_text())

    with respx.mock(base_url="https://test.example") as mock:
        mock.get("/api/v1/validators").mock(return_value=httpx.Response(200, json=fixture))
        client = JitoClient(base_url="https://test.example")
        rows = await client.get_validator_mev(epoch=600)

    assert len(rows) == len(fixture["validators"])
    s = rows[0]
    assert {"vote_pubkey", "epoch", "mev_revenue_lamports", "mev_commission_pct"} <= set(s.keys())
    assert s["epoch"] == 600
    assert s["vote_pubkey"] == "Vote111"
    assert s["mev_revenue_lamports"] == 12500000000
    assert s["mev_commission_pct"] == 5
