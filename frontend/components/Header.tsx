"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { isAdmin, isManager, isStaff } from "@/lib/api";
import { ROLE_LABELS } from "@/lib/content";
import { NAV, UTILITY } from "@/lib/nav";
import { Chevron, Logo, SearchIcon } from "./Icons";
import SiteSearch from "./SiteSearch";
import { useUser } from "./UserProvider";

function Dropdown({
  id,
  title,
  open,
  onToggle,
  children,
  right,
  current,
}: {
  id: string;
  title: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  right?: boolean;
  current?: boolean;
}) {
  return (
    <div className={`dd${open ? " open" : ""}${right ? " right" : ""}${current ? " cur" : ""}`}>
      <button type="button" aria-expanded={open} aria-controls={id} onClick={onToggle}>
        {title}
        <Chevron />
      </button>
      <div className="panel" id={id} hidden={!open}>
        {children}
      </div>
    </div>
  );
}

export default function Header() {
  const [openDd, setOpenDd] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const nav = useRef<HTMLElement>(null);
  const { user, logout } = useUser();

  useEffect(() => {
    setOpenDd(null);
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (nav.current && !nav.current.contains(e.target as Node)) setOpenDd(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenDd(null);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const toggle = (k: string) => setOpenDd((c) => (c === k ? null : k));
  const close = () => {
    setOpenDd(null);
    setMenuOpen(false);
  };

  const here = (h: string) => (h === "/" ? pathname === "/" : pathname === h || pathname.startsWith(`${h}/`));

  return (
    <header className="site">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <div className="topbar">
        <div className="wrap topbar-in">
          <span className="tagline">Your legal work. Simplified.</span>
          <nav aria-label="Site">
            {UTILITY.map(([t, h]) => (
              <Link key={h} href={h} aria-current={here(h) ? "page" : undefined}>
                {t}
              </Link>
            ))}
            <Link href="/track-request" aria-current={here("/track-request") ? "page" : undefined}>
              Track Request
            </Link>
          </nav>
        </div>
      </div>
      <div className="wrap bar">
        <Link className="brand" href="/" aria-label="Legal Core home">
          <Logo />
          <span>
            <b>Legal Core</b>
            <small>Legal support &amp; coordination</small>
          </span>
        </Link>
        <button className="burger" aria-expanded={menuOpen} aria-controls="menu" onClick={() => setMenuOpen((m) => !m)}>
          {menuOpen ? "Close" : "Menu"}
        </button>
        <nav className={`menu${menuOpen ? " show" : ""}`} id="menu" aria-label="Main" ref={nav}>
          <div className="mobile-only" style={{ paddingBlock: 6 }} hidden={!menuOpen}>
            <SiteSearch onGo={close} />
          </div>
          <div className="mobile-only util" hidden={!menuOpen}>
            {UTILITY.map(([t, h]) => (
              <Link key={h} href={h} onClick={close}>
                {t}
              </Link>
            ))}
          </div>
          {NAV.map((g, i) => (
            <Dropdown
              key={g.title}
              id={`dd${i}`}
              title={g.title}
              open={openDd === g.title}
              onToggle={() => toggle(g.title)}
              current={here(g.all[1])}
            >
              {g.items.map(([t, h]) => (
                <Link key={t} href={h} onClick={close}>
                  {t}
                </Link>
              ))}
              <Link className="all" href={g.all[1]} onClick={close}>
                {g.all[0]} →
              </Link>
            </Dropdown>
          ))}
          <Link className="search-link" href="/search" aria-label="Search">
            <SearchIcon />
          </Link>
          {user ? (
            <Dropdown
              id="dd-user"
              right
              open={openDd === "user"}
              onToggle={() => toggle("user")}
              title={
                <>
                  <span className="avatar" aria-hidden="true">
                    {user.name.trim().charAt(0).toUpperCase()}
                  </span>
                  <span>{user.name.split(" ")[0]}</span>
                </>
              }
            >
              <div className="who">
                <b>{user.name}</b>
                <span className="note">{user.roles.map((r) => ROLE_LABELS[r] || r).join(" · ")}</span>
              </div>
              <Link href="/dashboard" onClick={close}>
                My dashboard
              </Link>
              <Link href="/dashboard?tab=mine" onClick={close}>
                My requests
              </Link>
              <Link href="/dashboard?tab=notifications" onClick={close}>
                Notifications
              </Link>
              {isStaff(user) && (
                <Link href="/dashboard?tab=work" onClick={close}>
                  Work queue
                </Link>
              )}
              {isManager(user) && (
                <Link href="/admin" onClick={close}>
                  Reports
                </Link>
              )}
              {isAdmin(user) && (
                <Link href="/admin/advocates" onClick={close}>
                  Advocate verification
                </Link>
              )}
              <button
                type="button"
                className="all"
                onClick={async () => {
                  close();
                  await logout();
                  router.push("/");
                }}
              >
                Sign out
              </button>
            </Dropdown>
          ) : (
            <Link className="signin" href={`/login${pathname && pathname !== "/" && pathname !== "/login" ? `?next=${encodeURIComponent(pathname)}` : ""}`}>
              Sign In
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
