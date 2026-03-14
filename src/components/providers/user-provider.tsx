"use client";

import { createContext, useContext, useEffect } from "react";
import { useUserId } from "@/lib/hooks/use-user-id";
import { upsertUser } from "@/actions/cards";

const UserContext = createContext<string | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const userId = useUserId();

  // Sync user to DB once when userId is first generated — not an event handler, just a one-time sync
  useEffect(() => {
    if (!userId) return;
    upsertUser(userId).catch(console.error);
  }, [userId]);

  return <UserContext.Provider value={userId}>{children}</UserContext.Provider>;
}

export function useUser() {
  return useContext(UserContext);
}
