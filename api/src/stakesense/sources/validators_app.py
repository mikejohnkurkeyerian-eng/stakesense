from typing import Any

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from stakesense.config import settings


class ValidatorsAppClient:
    def __init__(self, token: str | None = None, timeout: float = 30.0) -> None:
        self._token = token or settings.validators_app_token
        self._base_url = "https://www.validators.app/api/v1"
        self._timeout = timeout

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
    async def get_all(self, network: str = "mainnet") -> list[dict[str, Any]]:
        url = f"{self._base_url}/validators/{network}.json"
        async with httpx.AsyncClient(timeout=self._timeout) as c:
            r = await c.get(url, headers={"Token": self._token})
            r.raise_for_status()
            return r.json()
