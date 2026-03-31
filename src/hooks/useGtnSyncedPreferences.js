"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios, { patchUsersMeKeepalive } from "@/services/api";
import { deepMergePreferences } from "@/lib/userPreferences";
import {
  buildMergedPreferencesFromServer,
  isServerPreferencesUntouched,
  readLegacyLocalStoragePreferences,
} from "@/lib/gtnSettingsPreferences";

const DEBOUNCE_MS = 450;

/**
 * Server-synced settings preferences + one-time migration from `gtn_pref_*` localStorage.
 *
 * @param {{ dbId?: number | null, preferences?: unknown } | null | undefined} user - dashboard user from GET /users/me
 * @param {(fullMe: object) => void} [onUserUpdated] - merge PATCH response into dashboard state
 */
export function useGtnSyncedPreferences(user, onUserUpdated) {
  const [prefs, setPrefs] = useState(() => buildMergedPreferencesFromServer(user?.preferences));
  const [saving, setSaving] = useState(false);
  const [patchError, setPatchError] = useState(null);

  const pendingRef = useRef(/** @type {Record<string, unknown>} */ ({}));
  const debounceRef = useRef(null);
  const migrationAttemptedRef = useRef(false);

  const serverSig = useMemo(() => JSON.stringify(user?.preferences ?? null), [user?.preferences]);

  useEffect(() => {
    if (!user?.dbId) return;
    setPrefs(buildMergedPreferencesFromServer(user.preferences));
  }, [user?.dbId, serverSig]);

  const flush = useCallback(async () => {
    const fragment = pendingRef.current;
    pendingRef.current = {};
    if (Object.keys(fragment).length === 0) return;
    setSaving(true);
    setPatchError(null);
    try {
      const res = await axios.patch("/users/me", { preferences: fragment });
      setPrefs(buildMergedPreferencesFromServer(res.data.preferences));
      onUserUpdated?.(res.data);
    } catch (e) {
      const msg = e?.message || "Could not save settings";
      setPatchError(msg);
      console.warn("[useGtnSyncedPreferences]", msg, e);
    } finally {
      setSaving(false);
    }
  }, [onUserUpdated]);

  const schedulePatch = useCallback(
    (fragment) => {
      pendingRef.current = deepMergePreferences(
        /** @type {Record<string, unknown>} */ (pendingRef.current),
        /** @type {Record<string, unknown>} */ (fragment)
      );
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        void flush();
      }, DEBOUNCE_MS);
    },
    [flush]
  );

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      const pending = pendingRef.current;
      pendingRef.current = {};
      const token =
        typeof window !== "undefined" ? window.localStorage.getItem("gtn_token") : null;
      patchUsersMeKeepalive(
        /** @type {Record<string, unknown>} */ (pending),
        token
      );
    },
    []
  );

  /** @param {keyof import("@/lib/userPreferences").GtnUserPreferences} section */
  const updateSection = useCallback(
    (section, partial) => {
      setPrefs((prev) => {
        const prevSection =
          prev[section] && typeof prev[section] === "object" && !Array.isArray(prev[section])
            ? /** @type {Record<string, unknown>} */ (prev[section])
            : {};
        const mergedSection = deepMergePreferences(prevSection, /** @type {Record<string, unknown>} */ (partial));
        const next = { ...prev, [section]: mergedSection };
        schedulePatch({ [section]: partial });
        return next;
      });
    },
    [schedulePatch]
  );

  // One-time: empty server prefs + legacy localStorage → PATCH
  useEffect(() => {
    if (!user?.dbId || migrationAttemptedRef.current) return;
    if (!isServerPreferencesUntouched(user.preferences)) {
      migrationAttemptedRef.current = true;
      return;
    }
    migrationAttemptedRef.current = true;
    const legacy = readLegacyLocalStoragePreferences();
    if (!legacy) return;
    let canceled = false;
    (async () => {
      try {
        const res = await axios.patch("/users/me", { preferences: legacy });
        if (canceled) return;
        setPrefs(buildMergedPreferencesFromServer(res.data.preferences));
        onUserUpdated?.(res.data);
      } catch {
        /* ignore — user can change a toggle to retry */
      }
    })();
    return () => {
      canceled = true;
    };
  }, [user?.dbId, user?.preferences, onUserUpdated]);

  return { prefs, updateSection, saving, patchError, flushPreferences: flush };
}
