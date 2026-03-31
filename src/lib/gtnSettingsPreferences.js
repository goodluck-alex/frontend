import { deepMergePreferences, normalizePreferences } from "@/lib/userPreferences";

/** @type {import("@/lib/userPreferences").GtnUserPreferences} */
export const GTN_PREFERENCE_DEFAULTS = {
  chat: {
    readReceiptsEnabled: true,
    typingIndicatorEnabled: true,
    mediaDownload: "wifi",
  },
  voice: {
    callQuality: "medium",
    muteOnCallStart: false,
    speakerDefault: true,
  },
  rooms: {
    roomAutoMute: false,
    whoCanInviteToRooms: "everyone",
    showActivityInRooms: true,
    roomNotifications: true,
  },
  security: {
    whoCanCall: "everyone",
    whoCanMessage: "everyone",
    whoCanSendRoomInvites: "everyone",
  },
  notifications: {
    calls: true,
    messages: true,
    voiceRoomInvites: true,
    referralRewards: true,
    planActivity: true,
    sound: true,
    vibration: true,
  },
  appearance: {
    themeMode: "dark",
    fontSize: "medium",
  },
  data: {
    dataSaver: false,
  },
};

function cloneDefaults() {
  return /** @type {import("@/lib/userPreferences").GtnUserPreferences} */ (
    JSON.parse(JSON.stringify(GTN_PREFERENCE_DEFAULTS))
  );
}

/**
 * Defaults first, then server overrides (same as pre-sync UX).
 * @param {unknown} serverRaw
 */
export function buildMergedPreferencesFromServer(serverRaw) {
  const server = normalizePreferences(serverRaw);
  return /** @type {import("@/lib/userPreferences").GtnUserPreferences} */ (
    deepMergePreferences(cloneDefaults(), /** @type {Record<string, unknown>} */ (server))
  );
}

/** True when DB has not stored any preference namespaces yet. */
export function isServerPreferencesUntouched(serverRaw) {
  const o = normalizePreferences(serverRaw);
  return Object.keys(o).length === 0;
}

function readLs(key) {
  try {
    return typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function parseBool(raw, defaultVal) {
  if (raw == null) return defaultVal;
  if (raw === "true") return true;
  if (raw === "false") return false;
  return defaultVal;
}

/**
 * One-time migration: legacy `gtn_pref_*` keys → nested preferences fragment for PATCH.
 * @returns {import("@/lib/userPreferences").GtnUserPreferences | null}
 */
export function readLegacyLocalStoragePreferences() {
  if (typeof window === "undefined") return null;

  /** @type {import("@/lib/userPreferences").GtnUserPreferences} */
  const out = {};

  const cq = readLs("gtn_pref_call_quality");
  if (cq && ["low", "medium", "high"].includes(cq)) {
    out.voice = { ...(out.voice || {}), callQuality: cq };
  }
  const mm = readLs("gtn_pref_mute_call_start");
  if (mm != null) {
    out.voice = { ...(out.voice || {}), muteOnCallStart: parseBool(mm, false) };
  }
  const sp = readLs("gtn_pref_speaker_default");
  if (sp != null) {
    out.voice = { ...(out.voice || {}), speakerDefault: parseBool(sp, true) };
  }

  const ram = readLs("gtn_pref_room_auto_mute");
  if (ram != null) {
    out.rooms = { ...(out.rooms || {}), roomAutoMute: parseBool(ram, false) };
  }
  const ri = readLs("gtn_pref_room_invites");
  if (ri && ["everyone", "contacts", "nobody"].includes(ri)) {
    out.rooms = { ...(out.rooms || {}), whoCanInviteToRooms: ri };
  }
  const ra = readLs("gtn_pref_room_activity");
  if (ra != null) {
    out.rooms = { ...(out.rooms || {}), showActivityInRooms: parseBool(ra, true) };
  }
  const rn = readLs("gtn_pref_room_notify");
  if (rn != null) {
    out.rooms = { ...(out.rooms || {}), roomNotifications: parseBool(rn, true) };
  }

  const mw = readLs("gtn_pref_msg_who");
  if (mw && ["everyone", "contacts"].includes(mw)) {
    out.security = { ...(out.security || {}), whoCanMessage: mw };
  }
  const rr = readLs("gtn_pref_read_receipts");
  if (rr != null) {
    out.chat = { ...(out.chat || {}), readReceiptsEnabled: parseBool(rr, true) };
  }
  const ty = readLs("gtn_pref_typing");
  if (ty != null) {
    out.chat = { ...(out.chat || {}), typingIndicatorEnabled: parseBool(ty, true) };
  }
  const md = readLs("gtn_pref_media_dl");
  if (md && ["wifi", "always", "never"].includes(md)) {
    out.chat = { ...(out.chat || {}), mediaDownload: md };
  }

  const nc = readLs("gtn_pref_notify_calls");
  if (nc != null) {
    out.notifications = { ...(out.notifications || {}), calls: parseBool(nc, true) };
  }
  const nm = readLs("gtn_pref_notify_messages");
  if (nm != null) {
    out.notifications = { ...(out.notifications || {}), messages: parseBool(nm, true) };
  }
  const nr = readLs("gtn_pref_notify_rooms");
  if (nr != null) {
    out.notifications = { ...(out.notifications || {}), voiceRoomInvites: parseBool(nr, true) };
  }
  const nref = readLs("gtn_pref_notify_referral");
  if (nref != null) {
    out.notifications = { ...(out.notifications || {}), referralRewards: parseBool(nref, true) };
  }
  const np = readLs("gtn_pref_notify_plans");
  if (np != null) {
    out.notifications = { ...(out.notifications || {}), planActivity: parseBool(np, true) };
  }
  const ns = readLs("gtn_pref_notify_sound");
  if (ns != null) {
    out.notifications = { ...(out.notifications || {}), sound: parseBool(ns, true) };
  }
  const nv = readLs("gtn_pref_notify_vibrate");
  if (nv != null) {
    out.notifications = { ...(out.notifications || {}), vibration: parseBool(nv, true) };
  }

  const ds = readLs("gtn_pref_data_saver");
  if (ds != null) {
    out.data = { ...(out.data || {}), dataSaver: parseBool(ds, false) };
  }

  const tm = readLs("gtn_pref_theme_mode");
  if (tm && ["dark", "light", "auto"].includes(tm)) {
    out.appearance = { ...(out.appearance || {}), themeMode: tm };
  }
  const fs = readLs("gtn_pref_font_size");
  if (fs && ["small", "medium", "large"].includes(fs)) {
    out.appearance = { ...(out.appearance || {}), fontSize: fs };
  }

  const sc = readLs("gtn_pref_sec_call");
  if (sc && ["everyone", "contacts", "nobody"].includes(sc)) {
    out.security = { ...(out.security || {}), whoCanCall: sc };
  }
  const sm = readLs("gtn_pref_sec_msg");
  if (sm && ["everyone", "contacts"].includes(sm)) {
    out.security = { ...(out.security || {}), whoCanMessage: sm };
  }
  const sri = readLs("gtn_pref_sec_room_inv");
  if (sri && ["everyone", "contacts", "nobody"].includes(sri)) {
    out.security = { ...(out.security || {}), whoCanSendRoomInvites: sri };
  }

  if (Object.keys(out).length === 0) return null;
  return out;
}
