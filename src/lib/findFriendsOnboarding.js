/** localStorage keys for Find Friends onboarding & soft reminders */

export const SKIP_KEY = "gtn_skip_find_friends";
export const SNOOZE_KEY = "gtn_find_friends_snooze_until";

export function getSkippedFindFriends() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(SKIP_KEY) === "1";
}

export function setSkippedFindFriends() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SKIP_KEY, "1");
}

export function clearSkippedFindFriends() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SKIP_KEY);
}

/** @returns {boolean} true if snooze is active (don't show reminder yet) */
export function isFindFriendsReminderSnoozed() {
  if (typeof window === "undefined") return true;
  const raw = window.localStorage.getItem(SNOOZE_KEY);
  if (!raw) return false;
  const until = new Date(raw).getTime();
  if (Number.isNaN(until)) return false;
  return Date.now() < until;
}

/** Default: snooze soft reminder for 7 days */
export function snoozeFindFriendsReminder(days = 7) {
  if (typeof window === "undefined") return;
  const until = new Date(Date.now() + days * 86400000).toISOString();
  window.localStorage.setItem(SNOOZE_KEY, until);
}
