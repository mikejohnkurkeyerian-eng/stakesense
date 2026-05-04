"use client";

import dynamic from "next/dynamic";

const PrivyAltLoginInner = dynamic(
  () => import("./PrivyAltLoginInner").then((m) => m.default),
  { ssr: false, loading: () => null }
);

export default function PrivyAltLogin() {
  if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID) {
    return null;
  }
  return <PrivyAltLoginInner />;
}
