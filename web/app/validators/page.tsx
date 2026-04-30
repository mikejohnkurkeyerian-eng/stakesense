import Link from "next/link";

import { listValidators } from "@/lib/api";

function fmtPct(x: number | null) {
  return x == null ? "—" : `${(x * 100).toFixed(1)}%`;
}
function fmtScore(x: number | null) {
  return x == null ? "—" : x.toFixed(3);
}
function shortPk(pk: string) {
  return `${pk.slice(0, 4)}…${pk.slice(-4)}`;
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; limit?: string; offset?: string }>;
}) {
  const sp = await searchParams;
  const sort = sp.sort ?? "composite";
  const limit = Number(sp.limit ?? 50);
  const offset = Number(sp.offset ?? 0);
  const data = await listValidators({ sort, limit, offset });

  return (
    <main className="container mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">
        All Validators ({data.total.toLocaleString()})
      </h1>
      <div className="mb-3 flex gap-2 text-sm">
        {["composite", "downtime", "mev_tax", "decentralization"].map((s) => (
          <Link
            key={s}
            href={`?sort=${s}`}
            className={`px-2 py-1 rounded border ${
              sort === s ? "bg-slate-900 text-white" : "bg-white"
            }`}
          >
            {s}
          </Link>
        ))}
      </div>
      <div className="overflow-x-auto rounded border">
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="text-left p-2">Validator</th>
              <th className="text-right p-2">Composite</th>
              <th className="text-right p-2">Downtime</th>
              <th className="text-right p-2">MEV Tax</th>
              <th className="text-right p-2">Decentralization</th>
              <th className="text-left p-2">DC / Country</th>
            </tr>
          </thead>
          <tbody>
            {data.results.map((v) => (
              <tr
                key={v.vote_pubkey}
                className="border-t hover:bg-slate-50"
              >
                <td className="p-2">
                  <Link
                    href={`/validators/${v.vote_pubkey}`}
                    className="text-blue-600"
                  >
                    {v.name ?? shortPk(v.vote_pubkey)}
                  </Link>
                </td>
                <td className="p-2 text-right">
                  {fmtScore(v.composite_score)}
                </td>
                <td className="p-2 text-right">
                  {fmtPct(v.downtime_prob_7d)}
                </td>
                <td className="p-2 text-right">{fmtPct(v.mev_tax_rate)}</td>
                <td className="p-2 text-right">
                  {fmtScore(v.decentralization_score)}
                </td>
                <td className="p-2">
                  {v.data_center ?? "—"}{" "}
                  {v.country && `· ${v.country}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
