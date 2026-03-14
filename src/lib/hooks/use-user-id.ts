"use client";

import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";

const USER_ID_KEY = "fiche-user-id";

export function useUserId(): string | null {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Check for ?session= param first (for multi-browser testing)
    const params = new URLSearchParams(window.location.search);
    const sessionParam = params.get("session");

    let id: string;
    if (sessionParam && isValidUUID(sessionParam)) {
      // Adopt the shared session
      id = sessionParam;
      localStorage.setItem(USER_ID_KEY, id);
      // Remove param from URL without reload
      const url = new URL(window.location.href);
      url.searchParams.delete("session");
      window.history.replaceState({}, "", url.toString());
    } else {
      id = localStorage.getItem(USER_ID_KEY) ?? "";
      if (!id) {
        id = uuidv4();
        localStorage.setItem(USER_ID_KEY, id);
      }
    }

    document.cookie = `fiche-user-id=${id}; path=/; max-age=31536000`;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUserId(id);
  }, []);

  return userId;
}

function isValidUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
