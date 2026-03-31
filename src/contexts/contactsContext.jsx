"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import axios from "@/services/api";
import { canUseContactPicker, flattenPickerContacts } from "@/lib/contactsPicker";
import { loadContactsMeta, mergeMatchIntoStore } from "@/lib/contactsStorage";

const ContactsContext = createContext(null);

export function ContactsProvider({ user, children }) {
  const [items, setItems] = useState([]);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");

  const reload = useCallback(() => {
    const { items: next, updatedAt: ts } = loadContactsMeta();
    setItems(next);
    setUpdatedAt(ts);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const syncFromDevice = useCallback(async () => {
    if (!user?.dbId) {
      setError("sign_in_required");
      return;
    }
    if (!canUseContactPicker()) {
      setError("picker_unavailable");
      return;
    }
    setSyncing(true);
    setError("");
    try {
      const selected = await navigator.contacts.select(["name", "tel"], { multiple: true });
      const entries = flattenPickerContacts(selected);
      if (!entries.length) {
        setError("no_contacts_selected");
        return;
      }
      const res = await axios.post("/users/contacts/match", { contacts: entries });
      mergeMatchIntoStore(res.data?.onGtn || [], res.data?.notOnGtn || []);
      reload();
    } catch (e) {
      if (e?.name === "AbortError" || e?.name === "NotAllowedError") {
        setError(e?.name === "NotAllowedError" ? "permission_denied" : "aborted");
      } else {
        setError(e?.message || "sync_failed");
      }
    } finally {
      setSyncing(false);
    }
  }, [user?.dbId, reload]);

  const value = useMemo(
    () => ({
      contacts: items,
      lastSyncedAt: updatedAt,
      syncing,
      error,
      setError,
      syncFromDevice,
      reload,
      pickerSupported: typeof window !== "undefined" && canUseContactPicker(),
    }),
    [items, updatedAt, syncing, error, syncFromDevice, reload]
  );

  return <ContactsContext.Provider value={value}>{children}</ContactsContext.Provider>;
}

export function useContacts() {
  const ctx = useContext(ContactsContext);
  if (!ctx) {
    return {
      contacts: [],
      lastSyncedAt: null,
      syncing: false,
      error: "",
      setError: () => {},
      syncFromDevice: async () => {},
      reload: () => {},
      pickerSupported: false,
    };
  }
  return ctx;
}
