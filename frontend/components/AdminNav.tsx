"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isAdmin, type User } from "@/lib/api";

export default function AdminNav({ user }: { user: User }) {
  const p = usePathname();
  const admin = isAdmin(user);
  const links: [string, string, boolean][] = [
    ["/admin", "Reports", true],
    ["/dashboard?tab=work", "Work queue", true],
    ["/admin/branches", admin ? "Branches" : "Branch details", true],
    ["/admin/advocates", "Advocate verification", admin],
    ["/admin/services", "Services", admin],
    ["/admin/users", "People and roles", admin],
    ["/admin/system", "System and notifications", admin],
    ["/admin/audit", "Activity log", admin],
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
