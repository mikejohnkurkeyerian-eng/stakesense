import Link from "next/link";

import { getValidator, listValidators } from "@/lib/api";
import type { ValidatorDetail, Validator } from "@/lib/types";

import ComparePicker from "./ComparePicker";

export const metadata = {
  title: "Compare validators",
  description: "Side-by-side comparison of validator scores.",
};

function shortPk(pk: string) {
  return `${pk.slice(0, 4)}…${pk.slice(-4)}`;
}
function pct(x: number | null | undefined) {
  return x == null ? "—" : `${(x * 100).toFixed(1)}%`;
}

function bar(value: number, color: string) {
  const w = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full ${color}`}
        style={{ width: `${w}%` }}
      />
    </div>
  );
}

async function fetchValidatorSafe(pk: string): Promise<ValidatorDetail | null> {
  try {
    return await getValidator(pk);
  } catch {
    return null;
  }
}

async function fetchAllValidatorsForPicker(): Promise<Validator[]> {
  // Fetch a healthy subset for the picker. 200 is the API max page.
  try {
    const data = await listValidators({ sort: "composite", limit: 200 });
    return data.results;
  } catch {
    return [];
  }
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ vs?: string }>;
}) {
  const sp = await searchParams;
  const pks = (sp.vs ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4);

  const [details, pickerOptions] = await Promise.all([
    Promise.all(pks.map(fetchValidatorSafe)),
    fetchAllValidatorsForPicker(),
  ]);

  const valid = details.filter((d): d is ValidatorDetail => d !== null);

  return (
    <main className="container mx-auto px-6 py-8 max-w-6xl">
      <h1 className="text-3xl font-bold mb-2">Compare validators</h1>
      <p className="text-slate-600 mb-6">
        Side-by-side score breakdown. Pick up to 4 validators.
      </p>

      <ComparePicker
        currentPks={pks}
        options={pickerOptions.map((v) => ({
          vote_pubkey: v.vote_pubkey,
          name: v.name,
          composite_score: v.composite_score,
          country: v.country,
        }))}
      />

      {valid.length === 0 ? (
        <div className="border rounded-lg p-8 text-center text-slate-500">
          Add validators above to start comparing.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {valid.map((d) => {
            const v = d.validator;
            return (
              <div
                key={v.vote_pubkey}
                className="border rounded-lg p-5 bg-white"
              >
                <div className="flex justify-between items-start mb-3">
                  <Link
                    href={`/validators/${v.vote_pubkey}`}
                    className="font-semibold hover:underline"
                  >
                    {v.name ?? shortPk(v.vote_pubkey)}
                  </Link>
                  <Link
                    href={`/compare?vs=${pks
                      .filter((pk) => pk !== v.vote_pubkey)
                      .join(",")}`}
                    className="text-slate-300 hover:text-red-500 text-sm"
                    aria-label="Remove from comparison"
                  >
                    ×
                  </Link>
                </div>
                <div className="text-xs font-mono text-slate-400 break-all mb-4">
                  {v.vote_pubkey}
                </div>

                <div className="text-center mb-5">
                  <div className="text-xs uppercase tracking-wide text-slate-500">
                    Composite
                  </div>
                  <div className="text-4xl font-bold">
                    {(v.composite_score ?? 0).toFixed(3)}
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Downtime risk</span>
                      <span className="font-medium">
                        {pct(v.downtime_prob_7d)}
                      </span>
                    </div>
                    {bar(v.downtime_prob_7d ?? 0, "bg-violet-500")}
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>MEV tax</span>
                      <span className="font-medium">{pct(v.mev_tax_rate)}</span>
                    </div>
                    {bar(v.mev_tax_rate ?? 0, "bg-blue-500")}
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Decentralization</span>
                      <span className="font-medium">
                        {(v.decentralization_score ?? 0).toFixed(3)}
                      </span>
                    </div>
                    {bar(v.decentralization_score ?? 0, "bg-emerald-500")}
                  </div>
                </div>

                <div className="border-t mt-4 pt-3 text-xs space-y-1 text-slate-500">
                  <div className="flex justify-between">
                    <span>Commission</span>
                    <span className="font-medium text-slate-900">
                      {v.commission_pct ?? "—"}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Stake (SOL)</span>
                    <span className="font-medium text-slate-900">
                      {v.active_stake
                        ? Math.round(v.active_stake / 1e9).toLocaleString()
                        : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Location</span>
                    <span className="font-medium text-slate-900">
                      {v.country ?? v.data_center ?? "—"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
