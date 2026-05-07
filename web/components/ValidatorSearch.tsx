"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Hit = {
  vote_pubkey: string;
  name: string | null;
  composite_score: number | null;
  country: string | null;
};

const PUBKEY_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export default function ValidatorSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setHits([]);
      return;
    }
    if (PUBKEY_RE.test(term)) {
      setHits([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE}/api/v1/validators?q=${encodeURIComponent(term)}&limit=8`,
          { signal: ctrl.signal },
        );
        if (!r.ok) {
          setHits([]);
          return;
        }
        const j = await r.json();
        setHits(j.results || []);
        setActive(0);
      } catch {
        // aborted or network — leave hits as-is
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
  }, [q]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (wrap.current && !wrap.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function go(pk: string) {
    setOpen(false);
    setQ("");
    router.push(`/validators/${pk}`);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const term = q.trim();
    if (e.key === "Enter") {
      if (PUBKEY_RE.test(term)) {
        go(term);
        return;
      }
      if (hits[active]) {
        go(hits[active].vote_pubkey);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, hits.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const isPubkey = PUBKEY_RE.test(q.trim());

  return (
    <div ref={wrap} className="relative max-w-xl mx-auto w-full">
      <input
        type="text"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search a validator by name or paste a vote pubkey…"
        aria-label="Search validators"
        className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
      />
      {open && q.trim().length >= 2 && (
        <div className="absolute z-20 left-0 right-0 mt-1 border border-slate-200 rounded-lg bg-white shadow-lg overflow-hidden">
          {isPubkey ? (
            <button
              type="button"
              onClick={() => go(q.trim())}
              className="w-full text-left px-4 py-3 hover:bg-violet-50 text-sm"
            >
              <span className="text-slate-500">Open validator</span>{" "}
              <span className="font-mono">{q.trim().slice(0, 8)}…{q.trim().slice(-4)}</span>{" "}
              <span className="text-violet-700">→</span>
            </button>
          ) : loading && hits.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-500">Searching…</div>
          ) : hits.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-500">
              No matches. Paste a full vote pubkey to jump to its detail page.
            </div>
          ) : (
            <ul role="listbox">
              {hits.map((h, i) => (
                <li key={h.vote_pubkey}>
                  <Link
                    href={`/validators/${h.vote_pubkey}`}
                    onClick={() => setOpen(false)}
                    onMouseEnter={() => setActive(i)}
                    className={`flex items-center justify-between px-4 py-2.5 text-sm border-b last:border-b-0 ${
                      i === active ? "bg-violet-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">
                        {h.name || h.vote_pubkey.slice(0, 8) + "…"}
                      </div>
                      <div className="text-xs font-mono text-slate-400 truncate">
                        {h.vote_pubkey}
                      </div>
                    </div>
                    <div className="ml-3 text-right shrink-0">
                      <div className="text-xs text-slate-500">composite</div>
                      <div className="font-mono text-sm">
                        {h.composite_score == null
                          ? "—"
                          : h.composite_score.toFixed(3)}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
