"""Read a wallet's Solana stake accounts via RPC.

Used by `/api/v1/portfolio/{owner}` to enumerate all stake accounts a given
wallet is the staker authority for, then surface delegation + activation
state per account so we can score concentration risk.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import httpx

STAKE_PROGRAM_ID = "Stake11111111111111111111111111111111111111"

# In a stake account, the "staker" authority pubkey lives at byte offset 12
# (after 4-byte state discriminator + 8-byte rent_exempt_reserve). The
# memcmp filter on getProgramAccounts uses base58.
STAKER_AUTHORITY_OFFSET = 12


@dataclass
class StakeAccount:
    """Subset of a stake account relevant to portfolio scoring."""

    pubkey: str
    lamports: int
    voter_pubkey: str | None  # delegated validator's vote_pubkey, if active
    activation_epoch: int | None
    deactivation_epoch: int | None
    state: str  # initialized / stake / inactive / etc

    @property
    def sol(self) -> float:
        return self.lamports / 1_000_000_000


async def fetch_stake_accounts_for_owner(
    rpc_url: str,
    owner_pubkey: str,
    timeout: float = 30.0,
) -> list[StakeAccount]:
    """Return every stake account whose staker authority is `owner_pubkey`.

    Notes:
    - Uses the public RPC `getProgramAccounts` with a memcmp filter on the
      staker-authority offset.
    - Result is parsed via the `jsonParsed` encoding, which gives us the
      delegation fields without manual byte unpacking.
    """
    body = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "getProgramAccounts",
        "params": [
            STAKE_PROGRAM_ID,
            {
                "encoding": "jsonParsed",
                "filters": [
                    {
                        "memcmp": {
                            "offset": STAKER_AUTHORITY_OFFSET,
                            "bytes": owner_pubkey,
                        }
                    }
                ],
            },
        ],
    }
    async with httpx.AsyncClient(timeout=timeout) as client:
        r = await client.post(rpc_url, json=body)
        r.raise_for_status()
        resp = r.json()
    if "error" in resp:
        raise RuntimeError(f"RPC error: {resp['error']}")
    return _parse_program_accounts(resp.get("result", []))


def _parse_program_accounts(rows: list[dict[str, Any]]) -> list[StakeAccount]:
    out: list[StakeAccount] = []
    for row in rows:
        try:
            account = row["account"]
            pubkey = row["pubkey"]
            lamports = int(account["lamports"])
            parsed = account.get("data", {}).get("parsed", {})
            state = parsed.get("type", "unknown")
            info = parsed.get("info", {})

            voter_pubkey: str | None = None
            activation_epoch: int | None = None
            deactivation_epoch: int | None = None

            stake = info.get("stake")
            if stake:
                delegation = stake.get("delegation", {})
                voter_pubkey = delegation.get("voter")
                ae = delegation.get("activationEpoch")
                de = delegation.get("deactivationEpoch")
                activation_epoch = int(ae) if ae is not None else None
                deactivation_epoch = (
                    int(de)
                    if de is not None and str(de) != "18446744073709551615"
                    else None
                )

            out.append(
                StakeAccount(
                    pubkey=pubkey,
                    lamports=lamports,
                    voter_pubkey=voter_pubkey,
                    activation_epoch=activation_epoch,
                    deactivation_epoch=deactivation_epoch,
                    state=state,
                )
            )
        except (KeyError, TypeError, ValueError):
            # Skip malformed rows rather than aborting the whole portfolio
            # query — defensive because this RPC shape varies across
            # delegated / undelegated / activating / deactivating states.
            continue
    return out
