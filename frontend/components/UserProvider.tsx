"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, ApiError, type User } from "@/lib/api";

interface Ctx {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<User | null>;
  setUser: (u: User | null) => void;
  logout: () => Promise<void>;
}

const UserContext = createContext<Ctx>({ user: null, loading: true, refresh: async () => null, setUser: () => {}, logout: async () => {} });

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const u = await api<User | null>("/auth/session");
      setUser(u);
      return u;
    } catch (e) {
      if (!(e instanceof ApiError) || e.status === 401) setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return <UserContext.Provider value={{ user, loading, refresh, setUser, logout }}>{children}</UserContext.Provider>;
}

export const useUser = () => useContext(UserContext);
