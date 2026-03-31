/**
 * WebRTC ICE configuration — STUN first (NAT discovery).
 * TURN can be added via env (same server as API or NEXT_PUBLIC_ICE_SERVERS_JSON).
 *
 * Usage:
 *   const pc = createPeerConnection();
 *   // or merge: new RTCPeerConnection({ ...getRtcConfiguration(), ...extra });
 */

const DEFAULT_STUN = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

/**
 * Synchronous ICE config for browser / SSR-safe defaults.
 * Set NEXT_PUBLIC_ICE_SERVERS_JSON to a JSON array of ICE server objects.
 */
export function getRtcConfiguration(overrides = {}) {
  let iceServers = DEFAULT_STUN;

  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_ICE_SERVERS_JSON) {
    try {
      const parsed = JSON.parse(process.env.NEXT_PUBLIC_ICE_SERVERS_JSON);
      if (Array.isArray(parsed) && parsed.length > 0) {
        iceServers = parsed;
      }
    } catch {
      // keep defaults
    }
  }

  return {
    iceServers,
    iceTransportPolicy: "all",
    ...overrides,
  };
}

/**
 * Fetch ICE config from API (same list as backend ICE_SERVERS_JSON, or defaults).
 * Use when you want one source of truth without rebuilding the frontend.
 */
function normalizeApiBase() {
  const raw = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api").trim();
  const noTrail = raw.replace(/\/+$/, "");
  if (noTrail.endsWith("/api")) return noTrail;
  return `${noTrail}/api`;
}

export async function fetchRtcConfigurationFromApi() {
  const res = await fetch(`${normalizeApiBase()}/webrtc/ice-config`);
  if (!res.ok) {
    return getRtcConfiguration();
  }
  const data = await res.json();
  if (!data?.iceServers || !Array.isArray(data.iceServers)) {
    return getRtcConfiguration();
  }
  return {
    iceServers: data.iceServers,
    iceTransportPolicy: data.iceTransportPolicy || "all",
  };
}

/**
 * Create RTCPeerConnection with STUN-first ICE.
 */
export function createPeerConnection(options = {}) {
  if (typeof RTCPeerConnection === "undefined") {
    throw new Error("RTCPeerConnection is not available in this environment");
  }
  return new RTCPeerConnection({
    ...getRtcConfiguration(),
    ...options,
  });
}
