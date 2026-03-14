"use client";

import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";

const USER_ID_KEY = "fiche-user-id";

export function useUserId(): string | null {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let id = localStorage.getItem(USER_ID_KEY);
    if (!id) {
      id = uuidv4();
      localStorage.setItem(USER_ID_KEY, id);
    }
    // Also set cookie for potential server reads
    document.cookie = `fiche-user-id=${id}; path=/; max-age=31536000`;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUserId(id);
  }, []);

  return userId;
}
