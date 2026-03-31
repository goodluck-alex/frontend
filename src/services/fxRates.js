// Frontend-only USD FX rates with caching.

const CACHE_KEY = "gtn_fx_usd_rates_v1";
const DEFAULT_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

function nowMs() {
  return Date.now();
}

function readCache() {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(CACHE_KEY) : null;
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (!parsed.rates || typeof parsed.rates !== "object") return null;
    if (typeof parsed.ts !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(payload) {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

/**
 * Fetch USD base FX rates once and cache them.
 * @param {{ ttlMs?: number }} [opts]
 */
export async function getUsdFxRates(opts = {}) {
  const ttlMs = typeof opts.ttlMs === "number" && opts.ttlMs > 0 ? opts.ttlMs : DEFAULT_TTL_MS;

  const cached = readCache();
  if (cached && nowMs() - cached.ts < ttlMs) return cached.rates;

  // Free endpoint with broad currency coverage.
  const res = await fetch("https://open.er-api.com/v6/latest/USD", { method: "GET" });
  if (!res.ok) throw new Error("Failed to fetch exchange rates");
  const data = await res.json();

  const rates = data?.rates;
  if (!rates || typeof rates !== "object") throw new Error("Invalid exchange rate response");

  writeCache({ ts: nowMs(), rates });
  return rates;
}

