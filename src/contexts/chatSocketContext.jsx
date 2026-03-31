"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createChatSocket } from "@/services/chatSocket";
import { isGtnMessageNotificationsDisabled } from "@/lib/messageNotificationsPrefs";

const ChatSocketContext = createContext(null);

function showReferralCompletedNotification(payload) {
  if (typeof window === "undefined" || typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  const name = payload?.referredName || "A friend";
  const mins = payload?.minutes ?? 10;
  const body = `${name} triggered your referral reward. You earned ${mins} free minutes.`;
  try {
    const n = new Notification("GTN — referral reward", {
      body,
      icon: "/gtn-header-logo.png",
      tag: "gtn-referral-reward",
      requireInteraction: false,
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    /* ignore */
  }
}

function showMessageNotification(msg) {
  if (typeof window === "undefined" || typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  if (isGtnMessageNotificationsDisabled()) return;
  if (!document.hidden) return;

  const preview =
    msg.type === "voice"
      ? "Voice message"
      : String(msg.content || "")
          .replace(/^__voice_pending__$/, "Voice message")
          .slice(0, 140);

  const title = "GTN — new message";
  try {
    const n = new Notification(title, {
      body: preview || "Open Messages to read.",
      icon: "/gtn-header-logo.png",
      tag: `gtn-msg-${msg.id}`,
      requireInteraction: false,
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    /* ignore */
  }
}

/**
 * One Socket.IO connection per signed-in dashboard session (stays alive across tabs).
 * Also shows a browser notification when a new message arrives while the tab is in the background.
 */
export function ChatSocketProvider({ user, children }) {
  const [socket, setSocket] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user?.dbId) {
      setSocket(null);
      socketRef.current = null;
      return;
    }
    const token = typeof window !== "undefined" ? localStorage.getItem("gtn_token") : null;
    const s = createChatSocket(token);
    socketRef.current = s;
    setSocket(s);
    return () => {
      s.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, [user?.dbId]);

  useEffect(() => {
    const s = socketRef.current;
    if (!s || !user?.dbId) return;

    const onIncoming = (msg) => {
      if (!msg || msg.roomId) return;
      if (msg.fromUserId === user.dbId) return;
      if (msg.toUserId !== user.dbId) return;
      showMessageNotification(msg);
    };

    const onReferralCompleted = (payload) => {
      if (!payload || payload.type !== "completed") return;
      showReferralCompletedNotification(payload);
    };

    s.on("message:new", onIncoming);
    s.on("referral:completed", onReferralCompleted);
    return () => {
      s.off("message:new", onIncoming);
      s.off("referral:completed", onReferralCompleted);
    };
  }, [socket, user?.dbId]);

  const value = useMemo(() => ({ socket, socketRef }), [socket]);

  return (
    <ChatSocketContext.Provider value={value}>{children}</ChatSocketContext.Provider>
  );
}

export function useChatSocket() {
  const ctx = useContext(ChatSocketContext);
  if (!ctx) {
    return { socket: null, socketRef: { current: null } };
  }
  return ctx;
}

/** Optional: request permission after user clicks Enable */
export function useRequestNotificationPermission() {
  return async () => {
    if (typeof Notification === "undefined") return "unsupported";
    if (Notification.permission === "granted") return "granted";
    if (Notification.permission === "denied") return "denied";
    try {
      const r = await Notification.requestPermission();
      return r;
    } catch {
      return "denied";
    }
  };
}
