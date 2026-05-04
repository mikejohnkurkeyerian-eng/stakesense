"use client";

import { usePrivy } from "@privy-io/react-auth";

export default function PrivyAltLoginInner() {
  const { ready, authenticated, login, logout, user } = usePrivy();
  if (!ready) {
    return (
      <button
        disabled
        className="px-4 py-2 border border-violet-200 bg-violet-50 text-violet-400 rounded text-sm font-medium"
      >
        Loading email login…
      </button>
    );
  }
  if (authenticated) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-emerald-700 font-medium">
          ✓ Logged in via Privy
        </span>
        <span className="text-slate-500 font-mono text-xs">
          {user?.email?.address || user?.google?.email || "social"}
        </span>
        <button
          onClick={logout}
          className="ml-2 px-2 py-1 text-xs text-slate-500 hover:text-slate-900 underline"
        >
          Sign out
        </button>
      </div>
    );
  }
  return (
    <button
      onClick={() => login()}
      className="px-4 py-2 bg-violet-600 text-white rounded hover:bg-violet-500 text-sm font-medium"
    >
      Email / Social login
    </button>
  );
}
