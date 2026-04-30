"""Jito MEV API client.

The public endpoint (kobe.mainnet.jito.network/api/v1/validators) returns the
list of Jito-running validators with their *current* MEV commission and the
ongoing-epoch rewards (which are 0 until the epoch finishes and rewards
distribute). It does NOT expose historical per-validator MEV rewards — only
network-aggregate totals via /api/v1/mev_rewards.

Practical signal we extract:
  - mev_commission_bps → the validator's MEV tax (what they take from MEV
    revenue before passing the rest to delegators). This is the feature that
    matters for the "MEV tax" pillar.
  - running_jito flag → if true, the validator participates in Jito.
"""
from typing import Any

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential


class JitoClient:
    def __init__(
        self,
        base_url: str = "https://kobe.mainnet.jito.network",
        timeout: float = 30.0,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
    async def _get(self, path: str) -> Any:
        async with httpx.AsyncClient(timeout=self._timeout) as c:
            r = await c.get(f"{self._base_url}{path}")
            r.raise_for_status()
            return r.json()

    async def get_validator_mev(self, epoch: int) -> list[dict[str, Any]]:
        """Return one row per Jito-running validator with commission + rewards.

        `mev_revenue_lamports` and `mev_to_delegators_lamports` are the rewards
        for `epoch` if Jito has finalized them, otherwise 0. `mev_commission_pct`
        is the integer percent (e.g. bps=500 → 5).
        """
        raw = await self._get("/api/v1/validators")
        validators = raw.get("validators", []) if isinstance(raw, dict) else raw
        rows: list[dict[str, Any]] = []
        for v in validators:
            vote = v.get("vote_account") or v.get("votePubkey") or v.get("validator")
            commission_bps = v.get("mev_commission_bps")
            commission_pct = (
                int(commission_bps / 100) if commission_bps is not None else None
            )
            mev_rewards = int(v.get("mev_rewards") or 0)
            to_delegators = (
                int(mev_rewards * (1 - (commission_bps or 0) / 10000))
                if commission_bps is not None
                else 0
            )
            rows.append({
                "vote_pubkey": vote,
                "epoch": epoch,
                "mev_revenue_lamports": mev_rewards,
                "mev_commission_pct": commission_pct,
                "mev_to_delegators_lamports": to_delegators,
            })
        return rows

    async def get_network_mev_summary(self) -> dict[str, Any]:
        """Network-aggregate MEV stats for the most recent finalized epoch."""
        return await self._get("/api/v1/mev_rewards")
