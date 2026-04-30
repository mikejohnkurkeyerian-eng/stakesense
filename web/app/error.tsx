"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to console for now; production would ship to a tracker.
    console.error(error);
  }, [error]);

  const isApiCold = error.message.includes("fetch") || error.message.includes("ECONNREFUSED");

  return (
    <main className="container mx-auto px-6 py-24 max-w-xl text-center">
      <div className="text-6xl font-bold text-red-300 mb-2">!</div>
      <h1 className="text-2xl font-semibold mb-3">Something broke</h1>
      <p className="text-slate-600 mb-2 text-sm">
        {isApiCold
          ? "The API is on a free-tier instance that sleeps after idle. Give it ~30 seconds to wake up and try again."
          : "An unexpected error occurred while rendering this page."}
      </p>
      {error.digest && (
        <p className="text-slate-400 text-xs font-mono mb-6">
          digest: {error.digest}
        </p>
      )}
      <div className="flex gap-3 justify-center">
        <button
          onClick={reset}
          className="px-5 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium"
        >
          Try again
        </button>
        <Link
          href="/"
          className="px-5 py-2.5 border border-slate-300 rounded-lg hover:bg-slate-50 font-medium"
        >
          Home
        </Link>
      </div>
    </main>
  );
}
