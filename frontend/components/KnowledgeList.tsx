"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ARTICLES, CATEGORIES } from "@/lib/articles";
import { fmtDay } from "@/lib/api";

export default function KnowledgeList() {
  const [cat, setCat] = useState<string>("All");
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return ARTICLES.filter((a) => cat === "All" || a.category === cat).filter((a) => {
      if (!words.length) return true;
      const hay = [a.title, a.summary, ...a.keywords, ...a.sections.map((s) => s.heading)].join(" ").toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [cat, q]);
  return (
    <div className="kc">
      <div className="kc-tools">
        <div className="search">
          <svg className="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <label className="sr-only" htmlFor="kc-q">
            Search articles
          </label>
          <input id="kc-q" type="search" placeholder="Search articles, e.g. cheque, FIR, sale deed" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="toggle" role="group" aria-label="Filter by category">
          {["All", ...CATEGORIES].map((c) => (
            <button key={c} type="button" aria-pressed={cat === c} onClick={() => setCat(c)}>
              {c}
            </button>
          ))}
        </div>
      </div>
      <p className="note" aria-live="polite">
        {list.length} article{list.length === 1 ? "" : "s"}
      </p>
      <div className="grid">
        {list.map((a) => (
          <Link className="card" href={`/knowledge/${a.slug}`} key={a.slug}>
            <span className="tag c">{a.category}</span>
            <h3>{a.title}</h3>
            <p className="muted">{a.summary}</p>
            <span className="note">Updated {fmtDay(a.updated)}</span>
            <span className="more">Read →</span>
          </Link>
        ))}
      </div>
      {list.length === 0 && <p className="muted">No articles match. Try another word, or <Link href="/request">ask our team</Link>.</p>}
    </div>
  );
}
