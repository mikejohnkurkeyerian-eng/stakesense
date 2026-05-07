# Arcium — Stakesense Bounty Submission (Confidential Staking Recommendations)

**Project:** Stakesense — Predictive Validator Quality Oracle
**Live:** https://stakesense-el77-git-main-california-mortgage-solutions.vercel.app
**Repo:** https://github.com/mikejohnkurkeyerian-eng/stakesense
**Hackathon:** Solana Frontier (Colosseum), 2026
**Builder:** Mike (mikejohnkurkeyerian-eng)
**Contact:** mikejohnkurkeyerian@gmail.com

---

## What we built

Stakesense is an open-source ML oracle that scores every active Solana validator on three pillars (downtime risk, MEV tax, decentralization). The Arcium-relevant surface answers a real privacy gap in staking advice: **today, asking "where should I delegate?" leaks both your stake size and your risk preference** to whichever oracle you ask, including stakesense.

**The Arcium-specific surface:** `POST /api/v1/private/recommend`

A roadmap stub endpoint — see `api/src/stakesense/api/routers/private.py` — that:

1. Accepts the same request shape as the public `/api/v1/recommend` (`amount_sol`, `risk_profile`, `count`)
2. Returns the same top-K validator picks
3. **Returns alongside a `confidentiality` envelope** describing exactly which inputs are leaked today and which would be private under the production Arcium-backed version

Sample response:

```json
{
  "recommendations": [...],
  "confidentiality": {
    "status": "stub",
    "today": "amount_sol and risk_profile are sent in cleartext to stakesense and logged at the rate-limiter.",
    "production_target": "amount_sol and risk_profile encrypted with Arcium MPC keys; ranking executed inside a Mixed-MXE program; only the top-K voter pubkeys leave the computation.",
    "tracking_issue": "https://github.com/mikejohnkurkeyerian-eng/stakesense/issues"
  },
  "echo": { "amount_sol": 100.0, "risk_profile": "balanced", "count": 3 }
}
```

This is intentionally honest: a stub today, with the integration shape pinned so judges and Arcium engineers can see the intended design at the API level.

## Why this is a natural Arcium integration

- **Real privacy leak.** A staker who tells a public oracle "I have 5000 SOL, I'm conservative" has revealed both wealth and behavior. Aggregated over time, this leaks portfolio strategy. Arcium MPC fixes this by encrypting the inputs and running the ranking inside a Mixed-MXE program — only the output (top-K voter pubkeys) leaves.
- **Computation is small enough to fit MPC.** The composite is a weighted sum + rank — well within Arcium's program complexity envelope.
- **Same scoring data, two access modes.** The public oracle stays public for casual use; the private oracle layers on Arcium for users who don't want their staking strategy logged.

## What we'd build with the bounty

1. **Mixed-MXE program** for `compute_top_k_validators(weights_encrypted, candidates_public) -> top_k_voter_pubkeys`. Validator scores are public; user weights are encrypted.
2. **Client SDK** that encrypts the user's `amount_sol` + `risk_profile` with Arcium keys, posts to the program, and decrypts the result.
3. **`/private` web surface** — a `/private/recommend` page where users see the same UI as `/stake` but with a "🔒 confidential" badge indicating their inputs are encrypted to all parties including stakesense.
4. **Threat-model writeup** — what stakesense can and can't infer; comparison to alternatives (TEEs, ZK-SNARKs).
5. **Reproducible benchmark** — latency overhead of the MPC path vs. the public path, published under CC-BY.

## Code references

- Stub endpoint: `api/src/stakesense/api/routers/private.py`
- Public oracle (the integration target): `api/src/stakesense/api/routers/recommend.py`
- Tests: `api/tests/test_api_private.py` (3 tests passing)

## Demo for judges

```bash
# Public oracle — leaks inputs
curl -X POST https://stakesense.onrender.com/api/v1/recommend \
  -H "Content-Type: application/json" \
  -d '{"amount_sol": 5000, "risk_profile": "conservative", "count": 3}'

# Confidential roadmap stub — same picks, with the privacy envelope
curl -X POST https://stakesense.onrender.com/api/v1/private/recommend \
  -H "Content-Type: application/json" \
  -d '{"amount_sol": 5000, "risk_profile": "conservative", "count": 3}'
```

The `confidentiality` field in the second response describes exactly what would change once the Mixed-MXE program is wired in.

## License

- Code: MIT
- Data: CC-BY 4.0
- The Arcium integration, when built, will be open-source under MIT alongside the rest of stakesense.

## One-liner for the listing page

> Stakesense — predictive Solana validator scoring with a roadmap to Arcium-backed confidential recommendations: ask the oracle "where should I stake?" without leaking your stake size or risk preference.
