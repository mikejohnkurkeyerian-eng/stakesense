# Security policy

## Reporting a vulnerability

If you find a security issue in stakesense, please **do not** open a public issue. Instead:

- Email **mikejohnkurkeyerian@gmail.com** with the subject line `stakesense security`
- Describe the issue and how to reproduce
- Allow up to 5 business days for an initial response

We commit to:
- Acknowledging receipt within 5 business days
- Triaging and confirming or rejecting the issue within 14 days
- Coordinating a fix and disclosure timeline with the reporter
- Crediting the reporter in the eventual public advisory if they want credit

There is no paid bounty at the time of this writing — stakesense is a hackathon-era public good. We may add one if funded post-hackathon.

## Supported versions

Stakesense is at version `0.x` — there is no LTS commitment yet. Security fixes will land on `main` and the live deploy.

## Scope

In scope for security disclosure:

- Authentication / authorization issues in the API
- SQL / command injection
- Server-side request forgery against backend endpoints
- Cross-site scripting / DOM-based XSS in the dashboard
- Subdomain takeover, dependency vulnerabilities
- Anything that could expose secrets or PII

Out of scope:

- Self-XSS or vulnerabilities requiring physical access to the user's machine
- Vulnerabilities in third-party services we depend on (please report directly to them: Helius, Supabase, Render, Vercel, Privy, Solana RPC providers)
- Predictions being "wrong" — the model is non-perfect by design; that's documented in `MODEL_CARD.md`
- The `/stake` flow on mainnet — it's currently devnet-only and not yet wired for mainnet

## Threat model

Stakesense reads public on-chain data, runs ML on it, and exposes the predictions via a public API. We do not custody user funds, do not store PII, and do not handle private keys server-side. The `/stake` flow constructs transactions in the browser which the user signs locally with their wallet.

The biggest realistic threats are:
- Malicious data ingestion that poisons the model (mitigated by data-quality checks in `data_quality.py` and idempotent upserts)
- Compromised dependency that breaks the build or ships malware (mitigated by `pnpm-lock.yaml`, `package.json` overrides, and infrequent dependency bumps)
- DoS via expensive endpoints (mitigated by `slowapi` rate limits and Render's free-tier scale-to-zero)

If you find something outside this list, report it anyway — the threat model isn't exhaustive.
