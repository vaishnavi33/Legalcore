"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { search, type SearchEntry } from "@/lib/content";
import { SearchIcon } from "./Icons";

/** Type what you need ("bail", "land problem", "Kurnool") and it takes you to the right page. */
export default function SiteSearch({ big = false, placeholder = "Search: bail, rent agreement, Kurnool…", onGo }: { big?: boolean; placeholder?: string; onGo?: () => void }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const router = useRouter();
  const box = useRef<HTMLDivElement>(null);
  const id = useId();
  const results: SearchEntry[] = search(q, 7);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function go(href: string) {
    setOpen(false);
    setQ("");
    onGo?.();
    router.push(href);
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, Math.max(results.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[active]) go(results[active].href);
      else if (q.trim()) go(`/search?q=${encodeURIComponent(q.trim())}`);
    }
  }

  return (
    <div className={`search${big ? " big" : ""}`} ref={box} role="search">
      <SearchIcon />
      <input
        type="search"
        aria-label="Search Legal Core"
        role="combobox"
        aria-expanded={open && q.length > 0}
        aria-controls={id}
        aria-autocomplete="list"
        placeholder={placeholder}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKey}
      />
      {open && q.trim().length > 0 && (
        <ul className="results" id={id} role="listbox">
          {results.length === 0 && (
            <li className="empty">
              No exact match. Press Enter to <Link href={`/individuals/legal-query`} onClick={() => go("/individuals/legal-query")}>ask us directly</Link>.
            </li>
          )}
          {results.map((r, i) => (
            <li key={r.href + r.title} role="option" aria-selected={i === active}>
              <a
                href={r.href}
                onMouseEnter={() => setActive(i)}
                onClick={(e) => {
                  e.preventDefault();
                  go(r.href);
                }}
              >
                <span>{r.title}</span>
                <small>{r.hint}</small>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
