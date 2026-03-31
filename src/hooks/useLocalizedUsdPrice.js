"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "@/contexts/localeContext";
import { getUsdFxRates } from "@/services/fxRates";
import { formatLocalizedPrice } from "@/lib/currencyDisplay";

/**
 * Frontend-only display conversion for USD prices.
 * - Uses user/profile-derived locale via LocaleProvider (profile -> backend IP detect -> browser fallback).
 * - Fetches USD FX rates lazily and caches them.
 * - Always returns a USD fallback (primary) if conversion fails.
 */
export function useLocalizedUsdPrice(usdAmount) {
  const { currencyCode } = useLocale();
  const [rate, setRate] = useState(null);

  useEffect(() => {
    const code = String(currencyCode || "USD").toUpperCase();
    if (!code || code === "USD") {
      setRate(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const rates = await getUsdFxRates();
        const next = Number(rates?.[code]);
        if (!cancelled) setRate(Number.isFinite(next) ? next : null);
      } catch {
        if (!cancelled) setRate(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currencyCode]);

  return useMemo(() => {
    return formatLocalizedPrice({
      usd: usdAmount,
      currencyCode,
      usdToCurrencyRate: rate,
    });
  }, [usdAmount, currencyCode, rate]);
}

