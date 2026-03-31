import { io } from "socket.io-client";

/** Socket.IO connects to HTTP server root (not /api). */
export function getChatSocketUrl() {
  const raw = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api").trim();
  const noTrail = raw.replace(/\/+$/, "");
  if (noTrail.endsWith("/api")) return noTrail.slice(0, -4);
  return noTrail.replace(/\/api\/?$/, "");
}

/**
 * @param {string | null} token JWT from localStorage
 * @returns {import("socket.io-client").Socket}
 */
export function createChatSocket(token) {
  const t = typeof token === "string" && token.length > 0 ? token : null;
  return io(getChatSocketUrl(), {
    auth: t ? { token: t } : {},
    transports: ["websocket", "polling"],
    autoConnect: true,
  });
}
