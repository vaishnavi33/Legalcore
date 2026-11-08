"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import type { User } from "@/lib/api";
import { useUser } from "./UserProvider";

/** Sends signed-out visitors to the sign-in page. The API checks permissions again on every call. */
export default function RequireUser({ children, allow }: { children: (u: User) => React.ReactNode; allow?: (u: User) => boolean }) {
  const { user, loading } = useUser();
  const router = useRouter();
  const path = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace(`/login?next=${encodeURIComponent(path + window.location.search)}`);
  }, [loading, user, router, path]);

  if (loading || !user)
    return (
      <div className="wrap hero">
        <p className="muted">Loading…</p>
      </div>
    );
  if (allow && !allow(user))
    return (
      <div className="wrap hero">
        <h1>This page is not for your account.</h1>
        <p className="lead">If you think you should have access, ask your branch manager or administrator.</p>
      </div>
    );
  return <>{children(user)}</>;
}
