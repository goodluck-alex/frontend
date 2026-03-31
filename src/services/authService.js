// services/authService.js
/** Base URL must end with /api (backend mounts routes at /api/auth, etc.) */
function normalizeApiBase() {
  const raw = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api").trim();
  const noTrail = raw.replace(/\/+$/, "");
  if (noTrail.endsWith("/api")) return noTrail;
  return `${noTrail}/api`;
}
const API = normalizeApiBase();

const AUTH_FETCH_MS = 28000;

async function authFetchJson(path, init, timeoutMs = AUTH_FETCH_MS) {
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${API}${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", ...(init.headers || {}) },
    });
    let data = {};
    try {
      data = await res.json();
    } catch {
      /* non-JSON body */
    }
    return { res, data };
  } catch (e) {
    if (e?.name === "AbortError") {
      throw new Error("Server did not respond in time. Check that the API is running and try again.");
    }
    throw new Error(e?.message || "Network error");
  } finally {
    clearTimeout(tid);
  }
}

export async function login(email, password) {
  const { res, data } = await authFetchJson("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  if (res.ok && data.twoFactorRequired && data.twoFactorToken) {
    return {
      twoFactorRequired: true,
      twoFactorToken: data.twoFactorToken,
    };
  }

  if (res.ok && data.token) {
    localStorage.setItem("gtn_token", data.token);
    return data;
  }
  throw new Error(data.error || data.message || "Login failed");
}

/** Finish login after TOTP or backup code (does not send password again). */
export async function completeLogin2fa(twoFactorToken, code) {
  const { res, data } = await authFetchJson("/auth/login/2fa", {
    method: "POST",
    body: JSON.stringify({ twoFactorToken, code: String(code || "").trim() }),
  });

  if (res.ok && data.token) {
    localStorage.setItem("gtn_token", data.token);
    return data;
  }
  throw new Error(data.error || data.message || "Verification failed");
}

/** Create account using name, email, and password. */
export async function register(userData) {
  const { res, data } = await authFetchJson("/auth/register", {
    method: "POST",
    body: JSON.stringify(userData),
  });

  if (res.ok && data.token) {
    localStorage.setItem("gtn_token", data.token);
    return data;
  }
  throw new Error(data.error || data.message || "Registration failed");
}

export function logout() {
  localStorage.removeItem("gtn_token");
}
