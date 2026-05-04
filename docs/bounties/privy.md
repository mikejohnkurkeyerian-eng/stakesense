# Privy — Stakesense Bounty Submission

**Project:** Stakesense — Predictive Validator Quality Oracle
**Live:** https://stakesense-el77-git-main-california-mortgage-solutions.vercel.app
**Repo:** https://github.com/mikejohnkurkeyerian-eng/stakesense
**Hackathon:** Solana Frontier (Colosseum), 2026
**Builder:** Mike (mikejohnkurkeyerian-eng)
**Contact:** mikejohnkurkeyerian@gmail.com

---

## What we built

Stakesense is an open-source ML validator oracle for Solana. The Privy integration provides email/social/embedded-wallet onboarding for users who want to stake on a recommended validator but don't already have a Solana wallet.

**The Privy-specific surfaces:**

1. **Optional Privy provider** (`web/components/PrivyOptionalProvider.tsx`) — dynamically loads `@privy-io/react-auth` only when `NEXT_PUBLIC_PRIVY_APP_ID` is set, so the same codebase ships with or without Privy depending on the deploy
2. **Email / Google / embedded-wallet login** on `/stake` alongside Phantom (`PrivyAltLogin`) — users without a wallet can email-login and Privy generates a Solana embedded wallet on first delegation
3. **Both modes coexist** — Phantom users stay in Phantom, Privy users get embedded wallets, and both go through the same recommendation engine and stake transaction
4. **Graceful degradation** — when no Privy app ID is configured, the component renders nothing, so a fork without a Privy app still ships cleanly

**Why this is a natural Privy integration:**

- The biggest UX barrier to staking is "do you have a Solana wallet?" — Privy removes it
- Email-login users can stake from a recommended validator in seconds, no extension to install, no seed phrase to write
- Embedded wallet creation on first delegation means the user doesn't pay a wallet-management cost until they actually need one

## Code references

- Provider: `web/components/PrivyOptionalProvider.tsx`
- Lazy client wrapper: `web/components/PrivyClientWrapper.tsx`
- Login button: `web/components/PrivyAltLogin.tsx` (+ `PrivyAltLoginInner.tsx`)
- /stake integration: `web/app/stake/page.tsx`
- Build override (transitive Solana SDK fix): root `package.json` → `pnpm.overrides[@solana/kit]`

The transitive-dependency fix is worth flagging: Privy's `@solana-program/token@0.9.0` imports `sequentialInstructionPlan` from `@solana/kit@2.3.0` where it doesn't exist — we pinned `@solana/kit` to `^5.5.1` via pnpm override. Documented in `docs/SUBMISSION.md` for any fork that hits the same issue.

## What we'd build with the bounty

1. **Funding flow** — let Privy users buy SOL with USDC/card via Privy's funding APIs and stake immediately (one-flow signup → fund → stake)
2. **Cross-device session continuity** — email login on mobile, sign on desktop
3. **Privy-native risk alerts** — opt-in notifications when a user's staked validator crosses a risk threshold
4. **DAO-style multi-user wallets** — combine Privy with Squads for treasury staking with email-authenticated council members

## Demo prompt for judges

1. Open https://stakesense-el77-git-main-california-mortgage-solutions.vercel.app/stake
2. Click "Email / Social login" — sign up with Gmail
3. The same recommendation flow renders — but the wallet is now an embedded Privy wallet, not Phantom
4. Click "Stake" on the top pick → tx confirmation, no extension installed

(Note: live demo requires `NEXT_PUBLIC_PRIVY_APP_ID` set in Vercel. Builder will configure this before submission and it can be tested live.)

## License & openness

- Code: MIT
- Data: CC-BY 4.0
- The Privy integration is published as part of the public stakesense repo — anyone can fork and bring their own Privy app

## One-liner for the listing page

> Stakesense — wallet-less staking via Privy email/social login, scoring every Solana validator on downtime risk, MEV tax, and decentralization.
