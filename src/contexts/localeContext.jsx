"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import axios from "@/services/api";

const DEFAULT_LOCALE = {
  countryIso: "UG",
  countryPrefix: "+256",
  currencyCode: "UGX",
  currencySymbol: "UGX",
};

const COUNTRY_MAP = {
  UG: { countryIso: "UG", countryPrefix: "+256", currencyCode: "UGX", currencySymbol: "UGX" },
  KE: { countryIso: "KE", countryPrefix: "+254", currencyCode: "KES", currencySymbol: "KES" },
  US: { countryIso: "US", countryPrefix: "+1", currencyCode: "USD", currencySymbol: "$" },
  GB: { countryIso: "GB", countryPrefix: "+44", currencyCode: "GBP", currencySymbol: "£" },
};

function detectLocale() {
  // 1) Use saved preference if you later add UI to select country.
  try {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem("gtn_locale") : null;
    if (saved && COUNTRY_MAP[saved]) return COUNTRY_MAP[saved];
  } catch {
    // ignore
  }

  // 2) Try from browser language (e.g. "en-KE", "sw-UG", "en-US")
  try {
    const parts = typeof navigator !== "undefined" && navigator.language ? navigator.language.split("-") : [];
    const maybeCountry = (parts[1] || "").toUpperCase();
    if (maybeCountry && COUNTRY_MAP[maybeCountry]) return COUNTRY_MAP[maybeCountry];
  } catch {
    // ignore
  }

  // 3) Try from timezone
  try {
    const tz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "";
    if (tz) {
      const tzLower = tz.toLowerCase();
      if (tzLower.includes("kampala") || tzLower.includes("nairobi")) {
        // fall-through to Africa mappings below
      }
      if (tzLower.includes("kampala")) return COUNTRY_MAP.UG;
      if (tzLower.includes("nairobi")) return COUNTRY_MAP.KE;

      // Common US timezones
      if (tzLower.startsWith("america/")) return COUNTRY_MAP.US;
    }
  } catch {
    // ignore
  }

  return DEFAULT_LOCALE;
}

const noop = () => {};

const LocaleContext = createContext({ ...DEFAULT_LOCALE, applyUserProfile: noop });

export function LocaleProvider({ children }) {
  const [locale, setLocale] = useState(DEFAULT_LOCALE);

  const applyUserProfile = useCallback((profile) => {
    if (!profile?.currencyCode) return;
    setLocale((prev) => ({
      countryIso: profile.countryIso || prev.countryIso,
      countryPrefix: profile.countryPrefix || prev.countryPrefix,
      currencyCode: profile.currencyCode,
      currencySymbol: profile.currencySymbol || profile.currencyCode || prev.currencySymbol,
    }));
  }, []);

  useEffect(() => {
    // Start with cached values (if any), else fallback to a quick heuristic.
    let initial = detectLocale();
    try {
      const cachedRaw = window.localStorage.getItem("gtn_locale_data");
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw);
        if (cached?.countryPrefix && cached?.currencyCode) {
          initial = {
            countryIso: cached.countryIso || initial.countryIso,
            countryPrefix: cached.countryPrefix,
            currencyCode: cached.currencyCode,
            currencySymbol: cached.currencyCode || initial.currencySymbol,
          };
        }
      }
    } catch {
      // ignore localStorage failures/parsing errors
    }
    setLocale(initial);

    // Then try a real IP-based lookup from the backend.
    (async () => {
      try {
        const res = await axios.get("/locale/detect");
        const detected = res?.data;
        if (detected?.countryPrefix && detected?.currencyCode) {
          setLocale({
            countryIso: detected.countryIso || initial.countryIso,
            countryPrefix: detected.countryPrefix,
            currencyCode: detected.currencyCode,
            currencySymbol: detected.currencyCode,
          });
          try {
            window.localStorage.setItem(
              "gtn_locale_data",
              JSON.stringify({
                countryIso: detected.countryIso || initial.countryIso,
                countryPrefix: detected.countryPrefix,
                currencyCode: detected.currencyCode,
              }),
            );
            window.localStorage.setItem("gtn_locale", detected.countryIso || initial.countryIso);
          } catch {
            // ignore localStorage failures
          }
        }
      } catch {
        // If IP lookup fails, keep heuristic values.
      }
    })();
  }, []);

  const value = useMemo(
    () => ({ ...locale, applyUserProfile }),
    [locale]
  );
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export const useLocale = () => useContext(LocaleContext);

