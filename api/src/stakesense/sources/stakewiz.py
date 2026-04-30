"""Stakewiz API client.

Stakewiz dropped per-epoch performance endpoints sometime before 2026-04. The
two endpoints that still work and we use:
  - /validators                       — current snapshot of all validators
  - /validator_total_stakes/{vote}    — historical activated_stake per epoch
"""
from typing import Any

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential


class StakewizClient:
    def __init__(self, base_url: str = "https://api.stakewiz.com", timeout: float = 30.0) -> None:
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
    async def _get(self, path: str) -> Any:
        async with httpx.AsyncClient(timeout=self._timeout) as c:
            r = await c.get(f"{self._base_url}{path}")
            r.raise_for_status()
            return r.json()

    async def get_validators(self) -> list[dict[str, Any]]:
        return await self._get("/validators")

    async def get_total_stakes(self, vote_pubkey: str) -> list[dict[str, Any]]:
        """Returns [{epoch, stake}, ...] per epoch for this validator (descending)."""
        return await self._get(f"/validator_total_stakes/{vote_pubkey}")
