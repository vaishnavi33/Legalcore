"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { isAdmin, isManager, isStaff } from "@/lib/api";
import { ROLE_LABELS } from "@/lib/content";
import { NAV } from "@/lib/nav";
import { Chevron, Logo, SearchIcon } from "./Icons";
import SiteSearch from "./SiteSearch";
import { useUser } from "./UserProvider";

function Dropdown({ id, title, open, onToggle, children, right }: { id: string; title: React.ReactNode; open: boolean; onToggle: () => void; children: React.ReactNode; right?: boolean }) {
  return (
    <div className={`dd${open ? " open" : ""}${right ? " right" : ""}`}>
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

  return (
    <header className="site">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <div className="wrap bar">
        <Link className="brand" href="/" aria-label="Legal Core home">
          <Logo />
          <b>LEGAL CORE</b>
        </Link>
        <div className="searchbar">
          <SiteSearch placeholder="Search Legal Core" />
        </div>
        <button className="burger" aria-expanded={menuOpen} aria-controls="menu" onClick={() => setMenuOpen((m) => !m)}>
          {menuOpen ? "Close" : "Menu"}
        </button>
        <nav className={`menu${menuOpen ? " show" : ""}`} id="menu" aria-label="Main" ref={nav}>
          <div className="mobile-only" style={{ paddingBlock: 6 }} hidden={!menuOpen}>
            <SiteSearch onGo={close} />
          </div>
          <Link className="search-link" href="/search" aria-label="Search">
            <SearchIcon />
          </Link>
          <Link href="/about" aria-current={pathname === "/about" ? "page" : undefined}>
            About Us
          </Link>
          {NAV.map((g, i) => (
            <Dropdown key={g.title} id={`dd${i}`} title={g.title} open={openDd === g.title} onToggle={() => toggle(g.title)}>
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
          <Link href="/knowledge" aria-current={pathname.startsWith("/knowledge") ? "page" : undefined}>
            Knowledge Centre
          </Link>
          <Link href="/contact" aria-current={pathname === "/contact" ? "page" : undefined}>
            Contact
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
              {isManager(user) && (
                <Link href="/admin/branches" onClick={close}>
                  Branch details
                </Link>
              )}
              {isAdmin(user) && (
                <Link href="/admin/users" onClick={close}>
                  People and roles
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
