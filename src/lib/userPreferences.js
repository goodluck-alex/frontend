/**
 * Mirror of backend `modules/users/userPreferencesSchema.js` (Phase A contract).
 * Source of truth for validation is the server; this file documents shape for JSDoc / helpers.
 *
 * GET /api/users/me includes `preferences` (object).
 * PATCH /api/users/me body: { name?, bio?, preferences? } — at least one field required.
 */

/**
 * @typedef {"everyone"|"contacts"|"nobody"} GtnAudience
 */

/**
 * @typedef {Object} GtnChatPreferences
 * @property {boolean} [readReceiptsEnabled]
 * @property {boolean} [typingIndicatorEnabled]
 * @property {"wifi"|"always"|"never"} [mediaDownload]
 */

/**
 * @typedef {Object} GtnVoicePreferences
 * @property {"low"|"medium"|"high"} [callQuality]
 * @property {boolean} [muteOnCallStart]
 * @property {boolean} [speakerDefault]
 */

/**
 * @typedef {Object} GtnRoomsPreferences
 * @property {boolean} [roomAutoMute]
 * @property {GtnAudience} [whoCanInviteToRooms]
 * @property {boolean} [showActivityInRooms]
 * @property {boolean} [roomNotifications]
 */

/**
 * @typedef {Object} GtnSecurityPreferences
 * @property {GtnAudience} [whoCanCall]
 * @property {GtnAudience} [whoCanMessage]
 * @property {GtnAudience} [whoCanSendRoomInvites]
 */

/**
 * @typedef {Object} GtnNotificationsPreferences
 * @property {boolean} [calls]
 * @property {boolean} [messages]
 * @property {boolean} [voiceRoomInvites]
 * @property {boolean} [referralRewards]
 * @property {boolean} [planActivity]
 * @property {boolean} [sound]
 * @property {boolean} [vibration]
 */

/**
 * @typedef {Object} GtnAppearancePreferences
 * @property {"dark"|"light"|"auto"} [themeMode]
 * @property {"small"|"medium"|"large"} [fontSize]
 */

/**
 * @typedef {Object} GtnDataPreferences
 * @property {boolean} [dataSaver]
 */

/**
 * @typedef {Object} GtnUserPreferences
 * @property {GtnChatPreferences} [chat]
 * @property {GtnVoicePreferences} [voice]
 * @property {GtnRoomsPreferences} [rooms]
 * @property {GtnSecurityPreferences} [security]
 * @property {GtnNotificationsPreferences} [notifications]
 * @property {GtnAppearancePreferences} [appearance]
 * @property {GtnDataPreferences} [data]
 */

/** Empty default; server may merge unknown top-level keys across versions. */
export const EMPTY_PREFERENCES = {};

/**
 * @param {unknown} raw
 * @returns {GtnUserPreferences}
 */
export function normalizePreferences(raw) {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return {};
  return /** @type {GtnUserPreferences} */ (raw);
}

/**
 * Deep-merge plain objects (nested). Unknown keys in `target` are kept.
 * @param {Record<string, unknown>} target
 * @param {Record<string, unknown>} patch
 * @returns {Record<string, unknown>}
 */
export function deepMergePreferences(target, patch) {
  const out = { ...target };
  for (const key of Object.keys(patch)) {
    const pv = patch[key];
    const tv = out[key];
    if (
      pv !== null &&
      typeof pv === "object" &&
      !Array.isArray(pv) &&
      tv !== null &&
      typeof tv === "object" &&
      !Array.isArray(tv)
    ) {
      out[key] = deepMergePreferences(
        /** @type {Record<string, unknown>} */ (tv),
        /** @type {Record<string, unknown>} */ (pv)
      );
    } else {
      out[key] = pv;
    }
  }
  return out;
}
