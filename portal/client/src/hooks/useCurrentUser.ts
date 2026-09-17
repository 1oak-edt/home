import { useEffect, useState } from "react";
import { APP_USERS } from "../types";

const STORAGE_KEY = "1oak.currentUser";

export function useCurrentUser() {
  const [user, setUser] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && (APP_USERS as readonly string[]).includes(stored)) return stored;
    } catch {
      /* ignore */
    }
    return APP_USERS[0];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, user);
    } catch {
      /* ignore */
    }
  }, [user]);

  return [user, setUser] as const;
}
