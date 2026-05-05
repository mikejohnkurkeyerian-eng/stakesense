"use client";

import { useEffect } from "react";

/**
 * Pings the stakesense API health endpoint on every page load so Render's
 * free-tier sleep doesn't bite the user when they navigate from the landing
 * page to a data-heavy route (/validators, /portfolio, etc.).
 *
 * Fire-and-forget. If the ping fails we don't care — the page that needs the
 * API will surface its own loading state.
 */
export default function ApiWarmup() {
  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_BASE;
    if (!base) return;
    fetch(`${base}/api/v1/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(45_000),
    }).catch(() => {});
  }, []);
  return null;
}
