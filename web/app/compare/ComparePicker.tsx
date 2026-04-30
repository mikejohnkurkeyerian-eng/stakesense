"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type Option = {
  vote_pubkey: string;
  name: string | null;
  composite_score: number | null;
  country: string | null;
};

function shortPk(pk: string) {
  return `${pk.slice(0, 4)}…${pk.slice(-4)}`;
}

export default function ComparePicker({
  currentPks,
  options,
}: {
  currentPks: string[];
  options: Option[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const base = options.filter((o) => !currentPks.includes(o.vote_pubkey));
    if (!query) return base.slice(0, 8);
    const q = query.toLowerCase();
    return base
      .filter(
        (o) =>
          o.vote_pubkey.toLowerCase().includes(q) ||
          (o.name?.toLowerCase().includes(q) ?? false) ||
          (o.country?.toLowerCase().includes(q) ?? false)
      )
      .slice(0, 8);
  }, [query, options, currentPks]);

  function add(pk: string) {
    if (currentPks.includes(pk)) return;
    if (currentPks.length >= 4) return;
    const next = [...currentPks, pk];
    setQuery("");
    setOpen(false);
    router.push(`/compare?vs=${next.join(",")}`);
  }

  const disabled = currentPks.length >= 4;

  return (
    <div className="mb-6 relative">
      <input
        type="search"
        placeholder={
          currentPks.length === 0
            ? "Search validators to compare…"
            : disabled
              ? "Max 4 validators in a comparison."
              : "Add another validator…"
        }
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        disabled={disabled}
        className="border rounded-lg px-3 py-2 w-full md:w-96 disabled:bg-slate-100 disabled:cursor-not-allowed"
      />
      {open && !disabled && filtered.length > 0 && (
        <div className="absolute z-20 mt-1 w-full md:w-96 border rounded-lg bg-white shadow-lg overflow-hidden">
          {filtered.map((o) => (
            <button
              key={o.vote_pubkey}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => add(o.vote_pubkey)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 border-b last:border-b-0 flex justify-between items-center"
            >
              <div>
                <div className="font-medium">
                  {o.name ?? shortPk(o.vote_pubkey)}
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  {o.vote_pubkey.slice(0, 12)}…
                  {o.country && ` · ${o.country}`}
                </div>
              </div>
              <div className="text-xs font-mono text-slate-500">
                {(o.composite_score ?? 0).toFixed(3)}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
