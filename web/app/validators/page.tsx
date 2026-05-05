import Link from "next/link";

import { listValidators } from "@/lib/api";

import ValidatorsTable from "./ValidatorsTable";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; limit?: string; offset?: string }>;
}) {
  const sp = await searchParams;
  const sort = sp.sort ?? "composite";
  const limit = Number(sp.limit ?? 200);
  const offset = Number(sp.offset ?? 0);

  let data: { results: unknown[]; total: number } | null = null;
  let error: string | null = null;
  try {
    data = (await listValidators({ sort, limit, offset })) as {
      results: unknown[];
      total: number;
    };
  } catch (e) {
    error = e instanceof Error ? e.message : "API request failed";
  }

  if (!data) {
    return (
      <main className="container mx-auto p-6">
        <div className="border rounded-lg p-8 bg-amber-50 border-amber-200 text-center max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-3 text-amber-900">
            API warming up
          </h1>
          <p className="text-amber-900 mb-3">
            The stakesense API runs on a free tier that sleeps after 15
            minutes of inactivity. Cold-start takes ~30–60 seconds. Refresh
            this page in a moment and it&apos;ll load.
          </p>
          {error && (
            <p className="text-xs text-amber-700 font-mono mb-4">{error}</p>
          )}
          <div className="flex gap-2 justify-center mt-4">
            <Link
              href="/validators"
              className="px-4 py-2 bg-amber-900 text-white rounded text-sm hover:bg-amber-800"
            >
              Refresh
            </Link>
            <Link
              href="/"
              className="px-4 py-2 border border-amber-300 text-amber-900 rounded text-sm hover:bg-amber-100"
            >
              ← Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto p-6">
      <ValidatorsTable
        rows={data.results as never}
        total={data.total}
        sort={sort}
      />
    </main>
  );
}
