/**
 * Surface incoming calls when the tab/app is not in view. In-app ring still runs when visible.
 * True cold-start / killed-app incoming requires push (FCM/APNs) — not implemented here.
 */

const LOCAL_NOTIF_ID = 92001401;
const WEB_NOTIF_TAG = "gtn-incoming-call";

let webNotifRef = null;

function isUiHidden() {
  if (typeof document === "undefined") return false;
  return document.hidden || document.visibilityState === "hidden";
}

async function ensureWebNotifyPermission() {
  if (typeof Notification === "undefined") return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission !== "default") return false;
  try {
    const r = await Notification.requestPermission();
    return r === "granted";
  } catch {
    return false;
  }
}

function showWebNotification(fromLabel) {
  if (typeof window === "undefined" || typeof Notification === "undefined") return;
  if (!isUiHidden()) return;
  if (Notification.permission !== "granted") return;
  try {
    webNotifRef?.close?.();
    webNotifRef = new Notification("GTN — Incoming call", {
      body: `From ${fromLabel}`,
      icon: "/gtn-header-logo.png",
      tag: WEB_NOTIF_TAG,
      requireInteraction: true,
    });
    webNotifRef.onclick = () => {
      window.focus();
      webNotifRef?.close?.();
      webNotifRef = null;
    };
  } catch {
    /* ignore */
  }
}

/**
 * @param {string} fromLabel Caller id / phone shown to user
 */
export async function alertIncomingCallBackground(fromLabel) {
  const label = String(fromLabel || "Unknown").slice(0, 80);
  if (isUiHidden()) {
    await ensureWebNotifyPermission();
    showWebNotification(label);
  }

  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return;
    if (!isUiHidden()) return;

    const { LocalNotifications } = await import("@capacitor/local-notifications");
    let perm = await LocalNotifications.checkPermissions();
    if (perm.display !== "granted") {
      perm = await LocalNotifications.requestPermissions();
    }
    if (perm.display !== "granted") return;

    await LocalNotifications.schedule({
      notifications: [
        {
          id: LOCAL_NOTIF_ID,
          title: "Incoming call",
          body: `From ${label}`,
          ongoing: true,
          autoCancel: false,
        },
      ],
    });
  } catch {
    /* plugin missing or permission denied */
  }
}

export async function clearIncomingCallAlerts() {
  try {
    webNotifRef?.close?.();
  } catch {
    /* ignore */
  }
  webNotifRef = null;

  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return;
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.cancel({ notifications: [{ id: LOCAL_NOTIF_ID }] });
  } catch {
    /* ignore */
  }
}
