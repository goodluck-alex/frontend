/** User turned off GTN background message alerts in Settings (browser may still show "allowed"). */
export const GTN_NOTIFY_DISABLED_KEY = "gtn_message_notifications_disabled";

export function isGtnMessageNotificationsDisabled() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(GTN_NOTIFY_DISABLED_KEY) === "1";
}

export function setGtnMessageNotificationsDisabled(disabled) {
  if (typeof window === "undefined") return;
  if (disabled) {
    window.localStorage.setItem(GTN_NOTIFY_DISABLED_KEY, "1");
  } else {
    window.localStorage.removeItem(GTN_NOTIFY_DISABLED_KEY);
  }
}
