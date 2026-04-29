from typing import Any

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential


class SolanaRpcClient:
    def __init__(self, rpc_url: str, timeout: float = 30.0) -> None:
        self._rpc_url = rpc_url
        self._timeout = timeout

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
    async def _post(self, body: dict[str, Any]) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            r = await client.post(self._rpc_url, json=body)
            r.raise_for_status()
            return r.json()

    async def get_vote_accounts(self) -> list[dict[str, Any]]:
        body = {"jsonrpc": "2.0", "id": 1, "method": "getVoteAccounts", "params": []}
        resp = await self._post(body)
        result = resp["result"]
        records: list[dict[str, Any]] = []
        for entry in result.get("current", []):
            records.append(self._normalize(entry, delinquent=False))
        for entry in result.get("delinquent", []):
            records.append(self._normalize(entry, delinquent=True))
        return records

    @staticmethod
    def _normalize(entry: dict[str, Any], *, delinquent: bool) -> dict[str, Any]:
        return {
            "vote_pubkey": entry["votePubkey"],
            "identity_pubkey": entry["nodePubkey"],
            "commission_pct": entry.get("commission"),
            "active_stake": entry.get("activatedStake"),
            "epoch_credits": entry.get("epochCredits", []),
            "last_vote": entry.get("lastVote"),
            "root_slot": entry.get("rootSlot"),
            "delinquent": delinquent,
        }
