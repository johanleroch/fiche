"use client";

import { createContext, useContext } from "react";
import { useUserId } from "@/lib/hooks/use-user-id";

const UserContext = createContext<string | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const userId = useUserId();
  return <UserContext.Provider value={userId}>{children}</UserContext.Provider>;
}

export function useUser() {
  return useContext(UserContext);
}
