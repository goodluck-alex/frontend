"use client";

import { useEffect, useState } from "react";
import axios from "@/services/api";

export function useAuthedUser() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await axios.get("/users/me");
        if (!cancelled) setUser(res.data);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { user, loading, isAuthed: Boolean(user?.dbId) };
}

