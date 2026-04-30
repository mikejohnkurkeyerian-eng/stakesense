import json

import httpx
import pytest
import respx

from stakesense.sources.stakewiz import StakewizClient


@pytest.mark.asyncio
async def test_get_total_stakes_returns_epoch_stake_series(fixture_dir):
    fixture = json.loads((fixture_dir / "stakewiz_total_stakes.json").read_text())

    with respx.mock(base_url="https://test.example") as mock:
        mock.get("/validator_total_stakes/Vote111").mock(
            return_value=httpx.Response(200, json=fixture)
        )
        client = StakewizClient(base_url="https://test.example")
        rows = await client.get_total_stakes("Vote111")

    assert len(rows) == 5
    assert rows[0]["epoch"] == 964
    assert isinstance(rows[0]["stake"], float)
