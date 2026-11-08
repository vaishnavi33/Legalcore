"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isAdmin, type User } from "@/lib/api";

export default function AdminNav({ user }: { user: User }) {
  const p = usePathname();
  const links: [string, string, boolean][] = [
    ["/admin", "Reports", true],
    ["/dashboard?tab=work", "Work queue", true],
    ["/admin/branches", isAdmin(user) ? "Branches and fees" : "Branch details", true],
    ["/admin/users", "People and roles", isAdmin(user)],
    ["/admin/audit", "Activity log", isAdmin(user)],
  ];
  return (
    <nav className="tabs" aria-label="Admin">
      {links
        .filter((l) => l[2])
        .map(([h, t]) => (
          <Link key={h} href={h} aria-current={p === h ? "page" : undefined}>
            {t}
          </Link>
        ))}
    </nav>
  );
}
