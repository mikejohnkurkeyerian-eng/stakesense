"""Portfolio auto-optimizer.

Given a wallet's positions and an objective, find the rebalance moves that
maximize the objective without creating new concentration risk. Greedy:
for each held position, swap to the best non-held candidate that improves
the objective by ≥ a minimum threshold; cap total swaps.

Objectives:
- composite (default) — maximize stake-weighted composite
- downtime           — minimize stake-weighted downtime probability
- decentralization   — maximize stake-weighted decentralization score

Pure functions; I/O lives in the API router.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal

Objective = Literal["composite", "downtime", "decentralization"]


@dataclass
class Move:
    from_voter_pubkey: str
    from_validator_name: str | None
    to_voter_pubkey: str
    to_validator_name: str | None
    sol: float
    objective_delta: float
    rationale: str


@dataclass
class OptimizeResult:
    objective: Objective
    moves: list[Move] = field(default_factory=list)
    objective_before: float | None = None
    objective_after: float | None = None
    total_sol_moved: float = 0.0
    notes: list[str] = field(default_factory=list)


def _objective_value(row: dict[str, Any], obj: Objective) -> float | None:
    if obj == "composite":
        v = row.get("composite_score")
    elif obj == "downtime":
        v = row.get("downtime_prob_7d")
        if v is not None:
            v = -float(v)  # minimize → maximize negative
    elif obj == "decentralization":
        v = row.get("decentralization_score")
    else:
        return None
    if v is None:
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _weighted(values: list[tuple[float, float]]) -> float | None:
    """values = [(weight, val), ...]. Returns weighted mean or None."""
    total_w = sum(w for w, _ in values)
    if total_w <= 0:
        return None
    return sum(w * v for w, v in values) / total_w


def optimize(
    positions: list[dict[str, Any]],
    candidates: list[dict[str, Any]],
    *,
    objective: Objective = "composite",
    max_moves: int = 5,
    min_delta_per_move: float = 0.05,
    held_data_centers_to_avoid: bool = True,
) -> OptimizeResult:
    """Greedy single-validator-at-a-time swap finder.

    `positions` are the wallet's existing scored stake delegations (dicts
    with at least {voter_pubkey, sol, composite_score, downtime_prob_7d,
    decentralization_score, data_center}).

    `candidates` are validator rows (top-N by composite, sorted desc).

    Returns the moves and before/after weighted objective.
    """
    result = OptimizeResult(objective=objective)
    if not positions:
        result.notes.append("No positions to optimize.")
        return result
    if not candidates:
        result.notes.append("No candidates available — try refreshing.")
        return result

    held_voters = {p["voter_pubkey"] for p in positions if p.get("voter_pubkey")}
    held_data_centers = {
        p.get("data_center") for p in positions if p.get("data_center")
    }

    # Compute the current weighted objective.
    pre_pairs: list[tuple[float, float]] = []
    for p in positions:
        if not p.get("voter_pubkey"):
            continue
        v = _objective_value(p, objective)
        if v is None:
            continue
        pre_pairs.append((float(p["sol"]), v))
    result.objective_before = _weighted(pre_pairs)

    # Sort positions worst-first on the objective so we improve the bottom.
    scored_positions = []
    for p in positions:
        if not p.get("voter_pubkey"):
            continue
        v = _objective_value(p, objective)
        if v is None:
            continue
        scored_positions.append((v, p))
    scored_positions.sort(key=lambda x: x[0])

    # Filter candidates to non-held; if avoiding shared DCs, drop those too.
    available = [c for c in candidates if c["vote_pubkey"] not in held_voters]
    if held_data_centers_to_avoid:
        available = [
            c for c in available
            if not (c.get("data_center") and c["data_center"] in held_data_centers)
        ] or available  # if filtering empties the pool, fall back

    moves: list[Move] = []
    used_targets: set[str] = set()

    for cur_v, pos in scored_positions:
        if len(moves) >= max_moves:
            break
        best_delta = 0.0
        best_cand: dict[str, Any] | None = None
        for cand in available:
            if cand["vote_pubkey"] in used_targets:
                continue
            cand_v = _objective_value(cand, objective)
            if cand_v is None:
                continue
            delta = cand_v - cur_v
            if delta < min_delta_per_move:
                continue
            if delta > best_delta:
                best_delta = delta
                best_cand = cand
        if best_cand is None:
            continue
        used_targets.add(best_cand["vote_pubkey"])
        rationale_bits: list[str] = [
            f"{objective} {('rises' if objective != 'downtime' else 'drops')} "
            f"{best_delta:+.3f}"
        ]
        if best_cand.get("data_center") and pos.get("data_center"):
            if best_cand["data_center"] != pos["data_center"]:
                rationale_bits.append(
                    f"DC: {pos['data_center']} → {best_cand['data_center']}"
                )
        moves.append(
            Move(
                from_voter_pubkey=pos["voter_pubkey"],
                from_validator_name=pos.get("name") or pos.get("validator_name"),
                to_voter_pubkey=best_cand["vote_pubkey"],
                to_validator_name=best_cand.get("name"),
                sol=float(pos["sol"]),
                objective_delta=round(best_delta, 6),
                rationale=", ".join(rationale_bits),
            )
        )

    result.moves = moves
    result.total_sol_moved = round(sum(m.sol for m in moves), 6)

    # Compute after-state weighted objective by applying each move.
    after_pairs: list[tuple[float, float]] = []
    moved_set = {m.from_voter_pubkey for m in moves}
    move_lookup: dict[str, Move] = {m.from_voter_pubkey: m for m in moves}
    for p in positions:
        vp = p.get("voter_pubkey")
        if not vp:
            continue
        if vp in moved_set:
            mv = move_lookup[vp]
            target = next(
                (c for c in candidates if c["vote_pubkey"] == mv.to_voter_pubkey),
                None,
            )
            if target is None:
                continue
            v = _objective_value(target, objective)
        else:
            v = _objective_value(p, objective)
        if v is None:
            continue
        after_pairs.append((float(p["sol"]), v))
    result.objective_after = _weighted(after_pairs)

    if not moves:
        result.notes.append(
            "No swaps cleared the minimum-improvement threshold; the portfolio "
            "is already well-aligned with this objective."
        )
    return result
