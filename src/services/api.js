// services/api.js
// Minimal axios-like wrapper so existing components can call `axios.get/post`.
// Backend mounts all REST routes under /api (e.g. /api/users/me).

function normalizeApiBase() {
  const raw = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api").trim();
  const noTrail = raw.replace(/\/+$/, "");
  if (noTrail.endsWith("/api")) return noTrail;
  return `${noTrail}/api`;
}

const API_BASE_URL = normalizeApiBase();

/** Default cap so a dead API cannot leave the UI spinning forever */
const DEFAULT_REQUEST_TIMEOUT_MS = 30000;

function buildUrl(endpoint) {
  if (!endpoint) return API_BASE_URL;
  if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) return endpoint;
  // Avoid double /api when env already includes it and callers pass /api/...
  let path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  if (path.startsWith("/api/")) {
    path = path.slice(4); // "/api/foo" -> "/foo"
  }
  return `${API_BASE_URL}${path}`;
}

function getAuthHeader() {
  if (typeof window === "undefined") return {};
  const token = window.localStorage.getItem("gtn_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(method, endpoint, body, options = {}) {
  const timeoutMs =
    typeof options.timeoutMs === "number" && options.timeoutMs > 0
      ? options.timeoutMs
      : DEFAULT_REQUEST_TIMEOUT_MS;
  const { timeoutMs: _omit, ...fetchOptions } = options;
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(buildUrl(endpoint), {
      method,
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(fetchOptions.headers || {}),
        ...getAuthHeader(),
      },
      body: body == null ? undefined : JSON.stringify(body),
    });
  } catch (e) {
    if (e?.name === "AbortError") {
      const err = new Error("Server did not respond in time. Check that the API is running and try again.");
      err.code = "TIMEOUT";
      throw err;
    }
    const err = new Error(e?.message || "Network error");
    err.code = "NETWORK";
    throw err;
  } finally {
    clearTimeout(tid);
  }

  const contentType = res.headers.get("content-type") || "";
  let data;
  try {
    data = contentType.includes("application/json") ? await res.json() : await res.text();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const message =
      typeof data === "object" && data
        ? data.message || data.error || "API request failed"
        : typeof data === "string" && data.trim()
          ? data.trim().slice(0, 200)
          : "API request failed";
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return { data, status: res.status, ok: res.ok };
}

export async function fetchWithToken(endpoint, options = {}) {
  // Keep backwards compatibility for any code using this helper.
  const res = await request(options.method || "GET", endpoint, undefined, options);
  return res.data;
}

export async function fetchCalls(userId) {
  const res = await request("GET", userId ? `/calls/history/${userId}` : "/calls/history");
  return res;
}

/**
 * Fire-and-forget PATCH with `keepalive` (e.g. on route unmount) so debounced prefs are not lost.
 * @param {Record<string, unknown>} preferencesFragment
 * @param {string | null} token
 */
export function patchUsersMeKeepalive(preferencesFragment, token) {
  if (!token || !preferencesFragment || Object.keys(preferencesFragment).length === 0) return;
  const url = buildUrl("/users/me");
  try {
    fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ preferences: preferencesFragment }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}

const axios = {
  get: (endpoint, options) => request("GET", endpoint, undefined, options),
  post: (endpoint, body, options) => request("POST", endpoint, body, options),
  patch: (endpoint, body, options) => request("PATCH", endpoint, body, options),
  put: (endpoint, body, options) => request("PUT", endpoint, body, options),
  delete: (endpoint, options) => request("DELETE", endpoint, undefined, options),
};

export default axios;
