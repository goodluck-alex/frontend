/**
 * GTN smart referral: persist ?ref= in localStorage until signup completes,
 * stable device key for fraud signals, and server click logging.
 */

const STORAGE_KEY = "gtn_referral_attribution";
const DEVICE_KEY = "gtn_device_key";

function normalizeApiBase() {
  const raw = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api").trim();
  const noTrail = raw.replace(/\/+$/, "");
  if (noTrail.endsWith("/api")) return noTrail;
  return `${noTrail}/api`;
}

function randomId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

/** Stable per-browser key (sent with signup + click logs). */
export function getOrCreateDeviceKey() {
  if (typeof window === "undefined") return "";
  try {
    let k = localStorage.getItem(DEVICE_KEY);
    if (!k) {
      k =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? `dk_${crypto.randomUUID()}`
          : `dk_${randomId()}`;
      localStorage.setItem(DEVICE_KEY, k);
    }
    return k;
  } catch {
    return "";
  }
}

/**
 * If current URL has ?ref=, merge into localStorage (recovery / delayed signup).
 * Returns the captured payload or null.
 */
export function captureReferralFromCurrentUrl() {
  if (typeof window === "undefined") return null;
  const p = new URLSearchParams(window.location.search);
  const ref = p.get("ref")?.trim();
  if (!ref) return null;
  const src = (p.get("src")?.trim() || "link").slice(0, 64);
  const meta = (p.get("meta")?.trim() || "").slice(0, 200);
  const payload = { ref, src, meta, clickedAt: Date.now() };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
  return payload;
}

export function getStoredReferralAttribution() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (!o || o.ref == null || String(o.ref).trim() === "") return null;
    return o;
  } catch {
    return null;
  }
}

export function clearStoredReferralAttribution() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Client-side signup invite path (Next.js app route).
 */
export function buildSignupInviteHref(refCode, { source, meta } = {}) {
  const p = new URLSearchParams({ mode: "signup", ref: String(refCode).trim() });
  if (source) p.set("src", String(source).slice(0, 64));
  if (meta != null && String(meta).trim() !== "") p.set("meta", String(meta).slice(0, 200));
  return `/login?${p.toString()}`;
}

/** Full URL for sharing / copying (logged-in user invites a friend). */
export function buildSignupInviteAbsoluteUrl(refCode, { source, meta } = {}) {
  if (typeof window === "undefined") return "";
  const path = buildSignupInviteHref(refCode, { source, meta });
  return `${window.location.origin}${path}`;
}

/** Fire-and-forget: POST /api/referrals/click (no auth). */
export async function logReferralClickHttp(refSubscriberId, source, sourceMeta) {
  const sid = parseInt(String(refSubscriberId).trim(), 10);
  if (!Number.isFinite(sid) || sid <= 0) return;
  const base = normalizeApiBase();
  const body = {
    refSubscriberId: sid,
    source: source ? String(source).slice(0, 64) : null,
    sourceMeta: sourceMeta ? String(sourceMeta).slice(0, 512) : null,
    deviceKey: getOrCreateDeviceKey() || null,
  };
  try {
    await fetch(`${base}/referrals/click`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    /* ignore */
  }
}
