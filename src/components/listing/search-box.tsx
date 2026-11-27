"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SearchBox({ initial = "" }: { initial?: string }) {
  const [q, setQ] = useState(initial);
  const router = useRouter();
  return (
    <form role="search" className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`); }}>
      <label htmlFor="page-search" className="sr-only">Search</label>
      <input id="page-search" className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Notes, moods, occasions, products…" />
      <button className="btn btn-primary">Search</button>
    </form>
  );
}
