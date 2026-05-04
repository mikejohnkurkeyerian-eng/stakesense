"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

/**
 * Dynamically loads Privy only when NEXT_PUBLIC_PRIVY_APP_ID is set, so
 * builds without a Privy app don't bundle (and don't break on) Privy's
 * transitive Solana SDK dependencies.
 */
const PrivyClientWrapper = dynamic(
  () => import("./PrivyClientWrapper").then((m) => m.default),
  { ssr: false, loading: () => null }
);

export default function PrivyOptionalProvider({
  children,
}: {
  children: ReactNode;
}) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  if (!appId) {
    return <>{children}</>;
  }
  return <PrivyClientWrapper appId={appId}>{children}</PrivyClientWrapper>;
}
