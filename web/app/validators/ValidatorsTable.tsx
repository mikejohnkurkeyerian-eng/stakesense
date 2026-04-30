"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { Validator } from "@/lib/types";

function fmtPct(x: number | null) {
  return x == null ? "—" : `${(x * 100).toFixed(1)}%`;
}
function fmtScore(x: number | null) {
  return x == null ? "—" : x.toFixed(3);
}
function shortPk(pk: string) {
  return `${pk.slice(0, 4)}…${pk.slice(-4)}`;
}

export default function ValidatorsTable({
  rows,
  total,
  sort,
}: {
  rows: Validator[];
  total: number;
  sort: string;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query) return rows;
    const q = query.toLowerCase();
    return rows.filter((v) => {
      return (
        v.vote_pubkey.toLowerCase().includes(q) ||
        (v.name?.toLowerCase().includes(q) ?? false) ||
        (v.country?.toLowerCase().includes(q) ?? false) ||
        (v.data_center?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [rows, query]);

  return (
    <>
      <div className="mb-4 flex flex-col md:flex-row gap-3 md:items-center justify-between">
        <h1 className="text-2xl font-semibold">
          Validators ({total.toLocaleString()})
        </h1>
        <input
          type="search"
          placeholder="Search by pubkey, name, country…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm w-full md:w-72"
        />
      </div>

      <div className="mb-3 flex gap-2 text-sm flex-wrap">
        <span className="text-slate-500 self-center mr-1">Sort:</span>
        {[
          ["composite", "Composite"],
          ["downtime", "Downtime"],
          ["mev_tax", "MEV tax"],
          ["decentralization", "Decentralization"],
        ].map(([s, label]) => (
          <Link
            key={s}
            href={`?sort=${s}`}
            className={`px-3 py-1 rounded-full border text-xs font-medium ${
              sort === s
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white hover:bg-slate-50"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="text-left p-3">Validator</th>
              <th className="text-right p-3">Composite</th>
              <th className="text-right p-3">Downtime</th>
              <th className="text-right p-3">MEV Tax</th>
              <th className="text-right p-3">Decentralization</th>
              <th className="text-left p-3">DC / Country</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((v) => (
              <tr
                key={v.vote_pubkey}
                className="border-t hover:bg-slate-50 transition-colors"
              >
                <td className="p-3">
                  <Link
                    href={`/validators/${v.vote_pubkey}`}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    {v.name ?? shortPk(v.vote_pubkey)}
                  </Link>
                </td>
                <td className="p-3 text-right font-mono">
                  {fmtScore(v.composite_score)}
                </td>
                <td className="p-3 text-right font-mono">
                  {fmtPct(v.downtime_prob_7d)}
                </td>
                <td className="p-3 text-right font-mono">
                  {fmtPct(v.mev_tax_rate)}
                </td>
                <td className="p-3 text-right font-mono">
                  {fmtScore(v.decentralization_score)}
                </td>
                <td className="p-3 text-slate-600">
                  {v.data_center ?? "—"}
                  {v.country && ` · ${v.country}`}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="p-6 text-center text-slate-500 text-sm"
                >
                  No validators match {`"${query}"`}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
