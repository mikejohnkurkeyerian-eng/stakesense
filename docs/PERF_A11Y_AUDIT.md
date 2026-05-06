# Performance / accessibility / SEO audit — 2026-05-05

Quick static review of the deployed Next.js 16 app. PageSpeed Insights API was rate-limiting on the night of the audit; this is a code-level walkthrough instead, biased toward fixes that ship in a single commit.

## What looks good

- **Metadata / OG**: `metadataBase`, OpenGraph, Twitter cards, manifest, themeColor all set in `web/app/layout.tsx`.
- **Fonts**: `next/font` (Geist, Geist Mono) — no FOUT, no third-party CSS round-trip.
- **No raw `<img>` tags** — every image goes through `next/image` or is inline SVG.
- **PWA**: `manifest.webmanifest` + theme color present.
- **Sitemap**: 18 routes listed, including `/simulate` (new tonight).
- **JSON-LD**: Dataset + Organization schemas inline on landing.
- **Force-dynamic** on API-dependent pages so the cold Vercel build doesn't block on Render.

## Fixes shipped tonight

- **Skip-to-content link** (`web/app/layout.tsx`) — visually-hidden anchor that becomes visible on focus, jumps to `#main-content`. WCAG 2.4.1.
- **Compare page remove-button contrast** (`web/app/compare/page.tsx:110`) — was `text-slate-300` (~1.83:1 vs white = AA fail). Now `text-slate-500` (~5.65:1 = pass).
- **`/simulate` icon button** has `aria-label="Remove validator"` from day one.

## Punchlist — recommended for next pass

1. Audit `text-slate-400` body text on white — currently ~3.4:1 (fails AA for normal-size). Acceptable for ≥18pt large text; risky elsewhere. Worst offenders:
   - `app/page.tsx` lines 271/282/293 (stat captions — small text)
   - `app/operator/[vote_pubkey]/page.tsx:320`
   - `app/backtest/page.tsx:101`
   - Bump to `text-slate-500` for normal-size text.
2. Add `aria-label` audit pass — currently 5 occurrences across 23 pages, low for an interactive site. Look for icon-only buttons in `app/playground`, `app/portfolio` (wallet button), `app/validators` filter chips.
3. Image dimensions — verify `<Image>` callsites all set `width` + `height` (or `fill` + sized parent) to avoid CLS during font swap.
4. Lazy-load heavy client-only chunks where they're not above-the-fold:
   - WalletProvider (currently always-loaded; could be a route-segment provider on `/stake` and `/portfolio` only)
   - Privy is already lazy via `next/dynamic`.
5. Run an actual Lighthouse pass with PSI API key (avoid 429) once a key is on hand. Target: 95+ mobile on landing, validators, /portfolio, /simulate.
