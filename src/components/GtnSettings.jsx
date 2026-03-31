"use client";

/**
 * GTN Settings — control center (plans, referrals, prefs).
 * Preference toggles sync to GET/PATCH /users/me (`preferences` JSON); legacy `gtn_pref_*` migrates once.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IoChevronBackOutline,
  IoPersonOutline,
  IoPeopleOutline,
  IoShieldCheckmarkOutline,
  IoCallOutline,
  IoMicOutline,
  IoChatbubblesOutline,
  IoNotificationsOutline,
  IoGiftOutline,
  IoCloudOutline,
  IoColorPaletteOutline,
  IoHelpCircleOutline,
  IoLogOutOutline,
  IoInformationCircleOutline,
  IoShieldOutline,
  IoDocumentTextOutline,
  IoMailOutline,
} from "react-icons/io5";
import GuestAuthPrompt from "@/components/GuestAuthPrompt";
import GtnContactsSection from "@/components/GtnContactsSection";
import MessageNotificationSettings from "@/components/MessageNotificationSettings";
import InviteReferral from "@/components/InviteReferral";
import { useLocale } from "@/contexts/localeContext";
import Link from "next/link";
import axios from "@/services/api";
import AboutBody from "@/components/legal/AboutBody";
import PrivacyBody from "@/components/legal/PrivacyBody";
import TermsBody from "@/components/legal/TermsBody";
import ContactBody from "@/components/legal/ContactBody";
import { useGtnSyncedPreferences } from "@/hooks/useGtnSyncedPreferences";

const SECTIONS = [
  { id: "account", label: "Account & Profile", icon: IoPersonOutline, desc: "Name, GTN number" },
  { id: "contacts", label: "Contacts", icon: IoPeopleOutline, desc: "Sync device, dial, chat & invites" },
  { id: "security", label: "Security & Privacy", icon: IoShieldCheckmarkOutline, desc: "2FA, who can reach you" },
  { id: "calls", label: "Calls & Voice", icon: IoCallOutline, desc: "Audio, mic, speaker" },
  { id: "rooms", label: "Voice Rooms", icon: IoMicOutline, desc: "Join behaviour, invites" },
  { id: "chat", label: "Chat & Messaging", icon: IoChatbubblesOutline, desc: "Read receipts, typing" },
  { id: "notifications", label: "Notifications", icon: IoNotificationsOutline, desc: "Calls, messages, plans" },
  { id: "referral", label: "Referral & Rewards", icon: IoGiftOutline, desc: "Link, stats, bonuses" },
  { id: "data", label: "Data & Storage", icon: IoCloudOutline, desc: "Data saver, cache" },
  { id: "appearance", label: "Appearance", icon: IoColorPaletteOutline, desc: "Theme, font size" },
  { id: "about", label: "About", icon: IoInformationCircleOutline, desc: "GTN mission & features" },
  { id: "privacy", label: "Privacy Policy", icon: IoShieldOutline, desc: "How we use your data" },
  { id: "terms", label: "Terms of Service", icon: IoDocumentTextOutline, desc: "Rules for using GTN" },
  { id: "contact", label: "Contact", icon: IoMailOutline, desc: "Email & social" },
  { id: "support", label: "Support & Help", icon: IoHelpCircleOutline, desc: "FAQ, version" },
];

function ToggleRow({ label, value, onChange, disabled }) {
  return (
    <label className="gtn-settings-toggle-row">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={Boolean(value)}
        className={`gtn-settings-switch ${value ? "on" : ""}`}
        onClick={() => !disabled && onChange(!value)}
        disabled={disabled}
      >
        <span className="gtn-settings-switch-knob" />
      </button>
    </label>
  );
}

function SelectRow({ label, value, options, onChange }) {
  return (
    <label className="gtn-settings-select-row">
      <span>{label}</span>
      <select className="gtn-settings-select" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SecurityTwoFactorPanel({ user, onUserUpdated }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [setup, setSetup] = useState(null);
  const [enableCode, setEnableCode] = useState("");
  const [backupCodes, setBackupCodes] = useState(null);
  const [disablePwd, setDisablePwd] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const enabled = Boolean(user?.twoFactorEnabled);

  const startSetup = async () => {
    setErr("");
    setBackupCodes(null);
    setBusy(true);
    try {
      const res = await axios.post("/users/me/2fa/setup");
      setSetup(res.data);
      setEnableCode("");
    } catch (e) {
      setErr(e?.data?.message || e?.message || "Could not start setup.");
      setSetup(null);
    } finally {
      setBusy(false);
    }
  };

  const confirmEnable = async () => {
    if (!enableCode.trim()) return;
    setErr("");
    setBusy(true);
    try {
      const res = await axios.post("/users/me/2fa/enable", { code: enableCode.replace(/\s/g, "") });
      setBackupCodes(res.data.backupCodes || []);
      setSetup(null);
      setEnableCode("");
      const me = await axios.get("/users/me");
      onUserUpdated?.(me.data);
    } catch (e) {
      setErr(e?.data?.message || e?.message || "Invalid code.");
    } finally {
      setBusy(false);
    }
  };

  const cancelSetup = () => {
    setSetup(null);
    setEnableCode("");
    setErr("");
  };

  const disable2fa = async () => {
    setErr("");
    setBusy(true);
    try {
      await axios.post("/users/me/2fa/disable", {
        password: disablePwd,
        code: disableCode.trim(),
      });
      setDisablePwd("");
      setDisableCode("");
      const me = await axios.get("/users/me");
      onUserUpdated?.(me.data);
    } catch (e) {
      setErr(e?.data?.message || e?.message || "Could not turn off 2FA.");
    } finally {
      setBusy(false);
    }
  };

  if (!user?.dbId) {
    return <p className="gtn-settings-hint">Sign in to manage two-factor authentication.</p>;
  }

  return (
    <div className="gtn-settings-twofa">
      <h3 className="gtn-settings-twofa-title">Two-factor authentication</h3>
      <p className="gtn-settings-hint">
        Optional: turn this on only if you want extra protection. While it&apos;s on, changing password, deleting your
        account, or signing out all devices also asks for a code from your app (or a backup code).
      </p>
      {err ? <p className="gtn-settings-inline-err">{err}</p> : null}

      {backupCodes?.length ? (
        <div className="gtn-settings-twofa-backups" role="status">
          <p>
            <strong>Save these backup codes</strong> somewhere safe. Each works once if you lose your phone.
          </p>
          <ul className="gtn-settings-twofa-backup-list">
            {backupCodes.map((c) => (
              <li key={c}>
                <code className="gtn-settings-code">{c}</code>
              </li>
            ))}
          </ul>
          <button type="button" className="gtn-settings-action-btn" onClick={() => setBackupCodes(null)}>
            I’ve saved them
          </button>
        </div>
      ) : null}

      {!enabled && !setup ? (
        <button
          type="button"
          className="gtn-settings-action-btn gtn-settings-action-btn--primary"
          disabled={busy}
          onClick={() => void startSetup()}
        >
          {busy ? "…" : "Turn on authenticator app"}
        </button>
      ) : null}

      {!enabled && setup ? (
        <div className="gtn-settings-twofa-setup">
          {setup.qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={setup.qrDataUrl} alt="Scan with your authenticator app" className="gtn-settings-twofa-qr" width={220} height={220} />
          ) : null}
          <p className="gtn-settings-hint">
            Or enter this key manually: <code className="gtn-settings-code">{setup.secret}</code>
          </p>
          <div className="gtn-settings-field">
            <label htmlFor="gtn-2fa-enable-code">6-digit code from the app</label>
            <input
              id="gtn-2fa-enable-code"
              className="gtn-settings-input"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={enableCode}
              onChange={(e) => setEnableCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
          </div>
          <div className="gtn-settings-twofa-actions">
            <button
              type="button"
              className="gtn-settings-action-btn gtn-settings-action-btn--primary"
              disabled={busy || enableCode.length !== 6}
              onClick={() => void confirmEnable()}
            >
              Confirm &amp; enable
            </button>
            <button type="button" className="gtn-settings-action-btn" disabled={busy} onClick={cancelSetup}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {enabled ? (
        <div className="gtn-settings-twofa-disable">
          <p className="gtn-settings-value">
            Authenticator app is <strong>on</strong> for this account.
          </p>
          <div className="gtn-settings-field">
            <label htmlFor="gtn-2fa-disable-pwd">Your password</label>
            <input
              id="gtn-2fa-disable-pwd"
              type="password"
              className="gtn-settings-input"
              autoComplete="current-password"
              value={disablePwd}
              onChange={(e) => setDisablePwd(e.target.value)}
            />
          </div>
          <div className="gtn-settings-field">
            <label htmlFor="gtn-2fa-disable-code">Authenticator or backup code</label>
            <input
              id="gtn-2fa-disable-code"
              className="gtn-settings-input"
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value)}
              autoComplete="one-time-code"
            />
          </div>
          <button
            type="button"
            className="gtn-settings-action-btn gtn-settings-action-btn--danger"
            disabled={busy}
            onClick={() => void disable2fa()}
          >
            Turn off 2FA
          </button>
        </div>
      ) : null}

      <hr className="gtn-settings-divider" />
    </div>
  );
}

export default function GtnSettings({ user, initialSection = null, onNavigateTab, onUserUpdated }) {
  const router = useRouter();
  const [logoutAllBusy, setLogoutAllBusy] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileErr, setProfileErr] = useState("");
  const [showPwdForm, setShowPwdForm] = useState(false);
  const [pwdCurrent, setPwdCurrent] = useState("");
  const [pwdNew, setPwdNew] = useState("");
  const [pwdConfirm, setPwdConfirm] = useState("");
  const [pwdBusy, setPwdBusy] = useState(false);
  const [pwdErr, setPwdErr] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePwd, setDeletePwd] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteErr, setDeleteErr] = useState("");
  const [pwdTwoFactorCode, setPwdTwoFactorCode] = useState("");
  const [deleteTwoFactorCode, setDeleteTwoFactorCode] = useState("");
  const [logout2faCode, setLogout2faCode] = useState("");
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsErr, setSessionsErr] = useState("");
  const [revokeSessionBusyId, setRevokeSessionBusyId] = useState(null);
  const [active, setActive] = useState(() =>
    initialSection && SECTIONS.some((s) => s.id === initialSection) ? initialSection : null
  );
  const { currencySymbol, currencyCode } = useLocale();
  const money = currencySymbol || currencyCode || "";
  const { prefs, updateSection, saving, patchError } = useGtnSyncedPreferences(user, onUserUpdated);

  const loadSessions = useCallback(async () => {
    if (!user?.dbId) return;
    setSessionsLoading(true);
    setSessionsErr("");
    try {
      const res = await axios.get("/users/me/sessions");
      setSessions(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setSessionsErr(e?.data?.message || e?.message || "Could not load sessions.");
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  }, [user?.dbId]);

  useEffect(() => {
    if (active !== "security" || !user?.dbId) return;
    void loadSessions();
  }, [active, user?.dbId, loadSessions]);

  const revokeSession = useCallback(
    async (row) => {
      if (!user?.dbId || !row?.id) return;
      if (!window.confirm(row.isCurrent ? "Sign out this device? You will need to sign in again." : "Revoke this session?")) {
        return;
      }
      setRevokeSessionBusyId(row.id);
      try {
        await axios.delete(`/users/me/sessions/${row.id}`);
        if (row.isCurrent) {
          try {
            window.localStorage.removeItem("gtn_token");
          } catch {
            /* ignore */
          }
          window.location.href = "/login";
          return;
        }
        await loadSessions();
      } catch (e) {
        window.alert(e?.data?.message || e?.message || "Could not revoke session.");
      } finally {
        setRevokeSessionBusyId(null);
      }
    },
    [user?.dbId, loadSessions]
  );

  useEffect(() => {
    if (!user?.dbId) return;
    setProfileName(user.username || "");
  }, [user?.dbId, user?.username]);

  const saveProfile = useCallback(async () => {
    setProfileErr("");
    const name = profileName.trim();
    if (name.length < 1) {
      setProfileErr("Enter a display name.");
      return;
    }
    setProfileSaving(true);
    try {
      const res = await axios.patch("/users/me", { name, bio: "" });
      onUserUpdated?.(res.data);
    } catch (e) {
      setProfileErr(e?.message || "Could not save profile");
    } finally {
      setProfileSaving(false);
    }
  }, [profileName, onUserUpdated]);

  const submitPasswordChange = useCallback(async () => {
    setPwdErr("");
    if (pwdNew !== pwdConfirm) {
      setPwdErr("New passwords do not match.");
      return;
    }
    if (pwdNew.length < 8) {
      setPwdErr("New password must be at least 8 characters.");
      return;
    }
    if (!/[A-Za-z]/.test(pwdNew) || !/[0-9]/.test(pwdNew)) {
      setPwdErr("New password must include a letter and a number.");
      return;
    }
    setPwdBusy(true);
    try {
      await axios.post("/users/me/password", {
        currentPassword: pwdCurrent,
        newPassword: pwdNew,
        ...(user?.twoFactorEnabled ? { twoFactorCode: pwdTwoFactorCode.trim() } : {}),
      });
      try {
        window.localStorage.removeItem("gtn_token");
      } catch {
        /* ignore */
      }
      window.location.href = "/login";
    } catch (e) {
      const msg =
        e?.data && typeof e.data === "object" && e.data.error
          ? String(e.data.error)
          : e?.message || "Could not change password";
      setPwdErr(msg);
    } finally {
      setPwdBusy(false);
    }
  }, [pwdCurrent, pwdNew, pwdConfirm, pwdTwoFactorCode, user?.twoFactorEnabled]);

  const submitDeleteAccount = useCallback(async () => {
    setDeleteErr("");
    setDeleteBusy(true);
    try {
      await axios.post("/users/me/delete", {
        password: deletePwd,
        ...(user?.twoFactorEnabled ? { twoFactorCode: deleteTwoFactorCode.trim() } : {}),
      });
      try {
        window.localStorage.removeItem("gtn_token");
      } catch {
        /* ignore */
      }
      window.location.href = "/login";
    } catch (e) {
      const msg =
        e?.data && typeof e.data === "object" && e.data.error
          ? String(e.data.error)
          : e?.message || "Could not delete account";
      setDeleteErr(msg);
    } finally {
      setDeleteBusy(false);
    }
  }, [deletePwd, deleteTwoFactorCode, user?.twoFactorEnabled]);

  const replaceSettingsUrl = useCallback((sectionId) => {
    const p = new URLSearchParams();
    p.set("tab", "settings");
    if (sectionId && SECTIONS.some((s) => s.id === sectionId)) {
      p.set("settingsSection", sectionId);
    }
    router.replace(`/dashboard?${p.toString()}`, { scroll: false });
  }, [router]);

  const openSection = useCallback(
    (id) => {
      setActive(id);
      replaceSettingsUrl(id);
    },
    [replaceSettingsUrl]
  );

  const closeSection = useCallback(() => {
    setActive(null);
    replaceSettingsUrl(null);
  }, [replaceSettingsUrl]);

  useEffect(() => {
    if (initialSection && SECTIONS.some((s) => s.id === initialSection)) {
      setActive(initialSection);
    } else if (initialSection == null) {
      setActive(null);
    }
  }, [initialSection]);

  const callQuality = prefs.voice?.callQuality ?? "medium";
  const muteOnCallStart = prefs.voice?.muteOnCallStart ?? false;
  const speakerDefault = prefs.voice?.speakerDefault ?? true;
  const roomAutoMute = prefs.rooms?.roomAutoMute ?? false;
  const roomInvites = prefs.rooms?.whoCanInviteToRooms ?? "everyone";
  const roomActivity = prefs.rooms?.showActivityInRooms ?? true;
  const roomNotify = prefs.rooms?.roomNotifications ?? true;
  const whoCanMessage = prefs.security?.whoCanMessage ?? "everyone";
  const readReceipts = prefs.chat?.readReceiptsEnabled ?? true;
  const typingIndicator = prefs.chat?.typingIndicatorEnabled ?? true;
  const mediaDl = prefs.chat?.mediaDownload ?? "wifi";
  const notifyCalls = prefs.notifications?.calls ?? true;
  const notifyMessages = prefs.notifications?.messages ?? true;
  const notifyRooms = prefs.notifications?.voiceRoomInvites ?? true;
  const notifyReferral = prefs.notifications?.referralRewards ?? true;
  const notifyPlans = prefs.notifications?.planActivity ?? true;
  const notifySound = prefs.notifications?.sound ?? true;
  const notifyVibrate = prefs.notifications?.vibration ?? true;
  const dataSaver = prefs.data?.dataSaver ?? false;
  const themeMode = prefs.appearance?.themeMode ?? "dark";
  const fontSize = prefs.appearance?.fontSize ?? "medium";
  const secCall = prefs.security?.whoCanCall ?? "everyone";
  const secRoomInv = prefs.security?.whoCanSendRoomInvites ?? "everyone";

  const applyBodyTheme = useCallback((mode) => {
    let dark = mode === "dark";
    if (mode === "auto" && typeof window !== "undefined" && window.matchMedia) {
      dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    document.body.classList.toggle("dark", dark);
    try {
      window.localStorage.setItem("gtn_theme", dark ? "dark" : "light");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    applyBodyTheme(themeMode);
  }, [themeMode, applyBodyTheme]);

  const onThemeSelect = (mode) => {
    updateSection("appearance", { themeMode: mode });
    if (mode === "light") {
      document.body.classList.remove("dark");
      try {
        window.localStorage.setItem("gtn_theme", "light");
      } catch {
        /* ignore */
      }
    } else if (mode === "dark") {
      document.body.classList.add("dark");
      try {
        window.localStorage.setItem("gtn_theme", "dark");
      } catch {
        /* ignore */
      }
    } else {
      applyBodyTheme("auto");
    }
  };

  const onFontSize = (size) => {
    updateSection("appearance", { fontSize: size });
    const map = { small: "15px", medium: "16px", large: "18px" };
    document.documentElement.style.setProperty("--gtn-base-font", map[size] || map.medium);
  };

  useEffect(() => {
    const map = { small: "15px", medium: "16px", large: "18px" };
    document.documentElement.style.setProperty("--gtn-base-font", map[fontSize] || map.medium);
  }, [fontSize]);

  const title = useMemo(() => SECTIONS.find((s) => s.id === active)?.label || "Settings", [active]);
  const twoFactorOn = Boolean(user?.twoFactorEnabled);

  const clearCache = () => {
    try {
      const keys = Object.keys(window.localStorage).filter(
        (k) => k.startsWith("gtn_") && !k.includes("token") && !k.includes("gtn_token")
      );
      keys.forEach((k) => window.localStorage.removeItem(k));
      window.alert("GTN preferences cache cleared. You may need to sign in again if session was cleared.");
    } catch {
      /* ignore */
    }
  };

  const localLogout = () => {
    try {
      window.localStorage.removeItem("gtn_token");
      window.location.href = "/login";
    } catch {
      /* ignore */
    }
  };

  const logoutAllDevices = async () => {
    if (twoFactorOn && !String(logout2faCode).trim()) {
      window.alert("Enter your authenticator or backup code to sign out all devices (2FA is on).");
      return;
    }
    if (typeof window !== "undefined" && !window.confirm("Sign out on every device? You will need to sign in again on this device too.")) {
      return;
    }
    setLogoutAllBusy(true);
    try {
      await axios.post("/users/me/logout-all-devices", {
        ...(user?.twoFactorEnabled ? { twoFactorCode: logout2faCode.trim() } : {}),
      });
      try {
        window.localStorage.removeItem("gtn_token");
      } catch {
        /* ignore */
      }
      window.location.href = "/login";
    } catch (e) {
      const msg =
        e?.data && typeof e.data === "object" ? e.data.error || e.data.message : null;
      window.alert(msg || e?.message || "Could not sign out all devices");
    } finally {
      setLogoutAllBusy(false);
    }
  };

  if (!user?.dbId) {
    return (
      <div className="phone-screen phone-screen-dark gtn-settings-root">
        <GuestAuthPrompt />
      </div>
    );
  }

  return (
    <div className="phone-screen phone-screen-dark gtn-settings-root">
      <div className="gtn-settings-topbar">
        {active ? (
          <button type="button" className="gtn-settings-back" onClick={closeSection} aria-label="Back">
            <IoChevronBackOutline size={22} />
          </button>
        ) : (
          <div className="gtn-settings-back-spacer" />
        )}
        <div className="gtn-settings-title-col">
          <h1 className="gtn-settings-title">{active ? title : "Settings"}</h1>
          <div className="gtn-settings-title-meta" aria-live="polite">
            {saving ? <span className="gtn-settings-save-hint">Saving…</span> : null}
            {patchError ? <span className="gtn-settings-save-err">{patchError}</span> : null}
          </div>
        </div>
        <div className="gtn-settings-back-spacer" />
      </div>

      {!active && (
        <>
          <div className="gtn-settings-profile-card">
            <div className="gtn-settings-avatar" aria-hidden>
              {user.username?.slice(0, 1)?.toUpperCase() || "G"}
            </div>
            <div className="gtn-settings-profile-text">
              <div className="gtn-settings-profile-name">{user.username || "Member"}</div>
              <div className="gtn-settings-profile-phone">{user.phone || user.id || "—"}</div>
            </div>
            <div className="gtn-settings-profile-plan">
              <span className="gtn-settings-plan-label">Plan</span>
              <span className="gtn-settings-plan-val">{user.planName || "Free Plan"}</span>
              {user.freeMinutes >= 1 ? (
                <span className="gtn-settings-plan-free">{Math.floor(user.freeMinutes)} free min</span>
              ) : null}
            </div>
          </div>

          <nav className="gtn-settings-section-list" aria-label="Settings sections">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              return (
                <button key={s.id} type="button" className="gtn-settings-section-btn" onClick={() => openSection(s.id)}>
                  <Icon size={22} className="gtn-settings-section-icon" aria-hidden />
                  <div className="gtn-settings-section-meta">
                    <span className="gtn-settings-section-label">{s.label}</span>
                    <span className="gtn-settings-section-desc">{s.desc}</span>
                  </div>
                  <span className="gtn-settings-chevron" aria-hidden>
                    ›
                  </span>
                </button>
              );
            })}
          </nav>
        </>
      )}

      {active === "contacts" && (
        <GtnContactsSection user={user} onNavigateTab={onNavigateTab} />
      )}

      {active === "account" && (
        <div className="gtn-settings-panel phone-panel-scroll">
          <p className="gtn-settings-hint">Profile photo upload coming soon.</p>
          {profileErr ? <p className="gtn-settings-inline-err">{profileErr}</p> : null}
          <div className="gtn-settings-field">
            <label htmlFor="gtn-profile-name">Full name</label>
            <input
              id="gtn-profile-name"
              className="gtn-settings-input"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              autoComplete="name"
              maxLength={120}
            />
          </div>
          <div className="gtn-settings-field">
            <label>GTN number</label>
            <div className="gtn-settings-value">{user.phone || `+${user.subscriberId}`}</div>
          </div>
          <div className="gtn-settings-field">
            <label>Email</label>
            <div className="gtn-settings-value muted">{user.email || "Not set"}</div>
            <p className="gtn-settings-hint">Email change needs verification — contact support for now.</p>
          </div>
          <button
            type="button"
            className="gtn-settings-action-btn"
            onClick={() => void saveProfile()}
            disabled={profileSaving}
          >
            {profileSaving ? "Saving…" : "Save profile"}
          </button>

          <hr className="gtn-settings-divider" />
          <button
            type="button"
            className="gtn-settings-action-btn"
            onClick={() => {
              setShowPwdForm((v) => !v);
              setPwdErr("");
              setPwdCurrent("");
              setPwdNew("");
              setPwdConfirm("");
              setPwdTwoFactorCode("");
            }}
          >
            {showPwdForm ? "Cancel password change" : "Change password"}
          </button>
          {showPwdForm ? (
            <div className="gtn-settings-subform">
              {pwdErr ? <p className="gtn-settings-inline-err">{pwdErr}</p> : null}
              <p className="gtn-settings-hint">
                At least 8 characters, with a letter and a number. You will be signed out everywhere after changing.
              </p>
              <div className="gtn-settings-field">
                <label htmlFor="gtn-pwd-current">Current password</label>
                <input
                  id="gtn-pwd-current"
                  type="password"
                  className="gtn-settings-input"
                  value={pwdCurrent}
                  onChange={(e) => setPwdCurrent(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              <div className="gtn-settings-field">
                <label htmlFor="gtn-pwd-new">New password</label>
                <input
                  id="gtn-pwd-new"
                  type="password"
                  className="gtn-settings-input"
                  value={pwdNew}
                  onChange={(e) => setPwdNew(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <div className="gtn-settings-field">
                <label htmlFor="gtn-pwd-confirm">Confirm new password</label>
                <input
                  id="gtn-pwd-confirm"
                  type="password"
                  className="gtn-settings-input"
                  value={pwdConfirm}
                  onChange={(e) => setPwdConfirm(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              {twoFactorOn ? (
                <div className="gtn-settings-field">
                  <label htmlFor="gtn-pwd-2fa">Authenticator or backup code</label>
                  <input
                    id="gtn-pwd-2fa"
                    className="gtn-settings-input"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={pwdTwoFactorCode}
                    onChange={(e) => setPwdTwoFactorCode(e.target.value)}
                    placeholder="Required while 2FA is on"
                  />
                </div>
              ) : null}
              <button
                type="button"
                className="gtn-settings-action-btn gtn-settings-action-btn--primary"
                onClick={() => void submitPasswordChange()}
                disabled={pwdBusy || (twoFactorOn && !pwdTwoFactorCode.trim())}
              >
                {pwdBusy ? "Updating…" : "Update password"}
              </button>
            </div>
          ) : null}

          <hr className="gtn-settings-divider" />
          {twoFactorOn ? (
            <div className="gtn-settings-field">
              <label htmlFor="gtn-logout-all-2fa">Code for “log out all devices”</label>
              <input
                id="gtn-logout-all-2fa"
                className="gtn-settings-input"
                autoComplete="one-time-code"
                value={logout2faCode}
                onChange={(e) => setLogout2faCode(e.target.value)}
                placeholder="Authenticator or backup code"
              />
              <p className="gtn-settings-hint">With 2FA on, this action needs your authenticator or a backup code.</p>
            </div>
          ) : null}
          <button
            type="button"
            className="gtn-settings-action-btn"
            onClick={() => void logoutAllDevices()}
            disabled={logoutAllBusy || (twoFactorOn && !logout2faCode.trim())}
          >
            {logoutAllBusy ? "Signing out…" : "Log out all devices"}
          </button>
          <button type="button" className="gtn-settings-action-btn gtn-settings-action-btn--danger" onClick={localLogout}>
            <IoLogOutOutline size={18} aria-hidden /> Log out this device
          </button>

          <hr className="gtn-settings-divider" />
          <p className="gtn-settings-hint">
            Deleting your account removes your messages and personal data from GTN. This cannot be undone.
          </p>
          {!showDeleteConfirm ? (
            <button
              type="button"
              className="gtn-settings-action-btn gtn-settings-action-btn--danger"
              onClick={() => {
                setShowDeleteConfirm(true);
                setDeletePwd("");
                setDeleteTwoFactorCode("");
                setDeleteErr("");
              }}
            >
              Delete account…
            </button>
          ) : (
            <div className="gtn-settings-subform">
              {deleteErr ? <p className="gtn-settings-inline-err">{deleteErr}</p> : null}
              <div className="gtn-settings-field">
                <label htmlFor="gtn-delete-pwd">Enter your password to confirm</label>
                <input
                  id="gtn-delete-pwd"
                  type="password"
                  className="gtn-settings-input"
                  value={deletePwd}
                  onChange={(e) => setDeletePwd(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              {twoFactorOn ? (
                <div className="gtn-settings-field">
                  <label htmlFor="gtn-delete-2fa">Authenticator or backup code</label>
                  <input
                    id="gtn-delete-2fa"
                    className="gtn-settings-input"
                    autoComplete="one-time-code"
                    value={deleteTwoFactorCode}
                    onChange={(e) => setDeleteTwoFactorCode(e.target.value)}
                    placeholder="Required while 2FA is on"
                  />
                </div>
              ) : null}
              <button
                type="button"
                className="gtn-settings-action-btn gtn-settings-action-btn--danger"
                onClick={() => void submitDeleteAccount()}
                disabled={deleteBusy || !deletePwd || (twoFactorOn && !deleteTwoFactorCode.trim())}
              >
                {deleteBusy ? "Deleting…" : "Permanently delete my account"}
              </button>
              <button
                type="button"
                className="gtn-settings-action-btn"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletePwd("");
                  setDeleteTwoFactorCode("");
                  setDeleteErr("");
                }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {active === "security" && (
        <div className="gtn-settings-panel phone-panel-scroll">
          <SecurityTwoFactorPanel user={user} onUserUpdated={onUserUpdated} />
          <SelectRow
            label="Who can call me"
            value={secCall}
            onChange={(v) => updateSection("security", { whoCanCall: v })}
            options={[
              { value: "everyone", label: "Everyone" },
              { value: "contacts", label: "Contacts only" },
              { value: "nobody", label: "Nobody" },
            ]}
          />
          <SelectRow
            label="Who can message me"
            value={whoCanMessage}
            onChange={(v) => updateSection("security", { whoCanMessage: v })}
            options={[
              { value: "everyone", label: "Everyone" },
              { value: "contacts", label: "Contacts only" },
            ]}
          />
          <SelectRow
            label="Voice room invites"
            value={secRoomInv}
            onChange={(v) => updateSection("security", { whoCanSendRoomInvites: v })}
            options={[
              { value: "everyone", label: "Everyone" },
              { value: "contacts", label: "Contacts" },
              { value: "nobody", label: "Nobody" },
            ]}
          />
          <div className="gtn-settings-field">
            <label>Active sessions</label>
            {sessionsErr ? <p className="gtn-settings-inline-err">{sessionsErr}</p> : null}
            {sessionsLoading ? (
              <div className="gtn-settings-value muted">Loading…</div>
            ) : sessions.length === 0 ? (
              <div className="gtn-settings-value muted">No active sessions</div>
            ) : (
              <ul className="gtn-settings-block-list" aria-label="Active sessions">
                {sessions.map((s) => {
                  const uaShort =
                    s.userAgent && String(s.userAgent).length > 60
                      ? `${String(s.userAgent).slice(0, 57)}…`
                      : s.userAgent || "Unknown browser";
                  const last = s.lastSeenAt ? new Date(s.lastSeenAt).toLocaleString() : "";
                  return (
                    <li key={s.id} className="gtn-settings-block-row">
                      <span className="gtn-settings-block-meta">
                        {s.isCurrent ? <strong>This device</strong> : "Signed in"}
                        {last ? ` · Last active ${last}` : ""}
                        {s.ipHint ? ` · ${s.ipHint}` : ""}
                        <br />
                        <span className="muted" style={{ fontWeight: 400 }}>
                          {uaShort}
                        </span>
                      </span>
                      <button
                        type="button"
                        className="gtn-settings-action-btn gtn-settings-action-btn--danger"
                        disabled={revokeSessionBusyId === s.id}
                        onClick={() => void revokeSession(s)}
                      >
                        {revokeSessionBusyId === s.id ? "…" : s.isCurrent ? "Sign out" : "Revoke"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="gtn-settings-hint">
              Revoking a session invalidates that login. Older installs may still show until they next connect.
            </p>
          </div>
          <p className="gtn-settings-hint">
            To permanently delete your account, open <strong>Account &amp; Profile</strong> in Settings.
          </p>
        </div>
      )}

      {active === "calls" && (
        <div className="gtn-settings-panel phone-panel-scroll">
          <SelectRow
            label="Audio quality"
            value={callQuality}
            onChange={(v) => updateSection("voice", { callQuality: v })}
            options={[
              { value: "low", label: "Low (save data)" },
              { value: "medium", label: "Medium" },
              { value: "high", label: "High" },
            ]}
          />
          <ToggleRow
            label="Mute mic when call starts"
            value={muteOnCallStart}
            onChange={(v) => updateSection("voice", { muteOnCallStart: v })}
          />
          <ToggleRow
            label="Speaker default on"
            value={speakerDefault}
            onChange={(v) => updateSection("voice", { speakerDefault: v })}
          />
          {onNavigateTab ? (
            <button type="button" className="gtn-settings-action-btn" onClick={() => onNavigateTab("history")}>
              Open call history
            </button>
          ) : (
            <Link href="/dashboard?tab=history" className="gtn-settings-action-btn gtn-settings-link-btn">
              Open call history
            </Link>
          )}
        </div>
      )}

      {active === "rooms" && (
        <div className="gtn-settings-panel phone-panel-scroll">
          <ToggleRow
            label="Auto-mute when joining a room"
            value={roomAutoMute}
            onChange={(v) => updateSection("rooms", { roomAutoMute: v })}
          />
          <SelectRow
            label="Who can invite me"
            value={roomInvites}
            onChange={(v) => updateSection("rooms", { whoCanInviteToRooms: v })}
            options={[
              { value: "everyone", label: "Everyone" },
              { value: "contacts", label: "Contacts" },
              { value: "nobody", label: "Nobody" },
            ]}
          />
          <ToggleRow
            label="Show my activity in rooms"
            value={roomActivity}
            onChange={(v) => updateSection("rooms", { showActivityInRooms: v })}
          />
          <ToggleRow
            label="Room notifications"
            value={roomNotify}
            onChange={(v) => updateSection("rooms", { roomNotifications: v })}
          />
          {onNavigateTab ? (
            <button type="button" className="gtn-settings-action-btn" onClick={() => onNavigateTab("rooms")}>
              Open voice rooms
            </button>
          ) : (
            <Link href="/dashboard?tab=rooms" className="gtn-settings-action-btn gtn-settings-link-btn">
              Open voice rooms
            </Link>
          )}
        </div>
      )}

      {active === "chat" && (
        <div className="gtn-settings-panel phone-panel-scroll">
          <SelectRow
            label="Who can message me"
            value={whoCanMessage}
            onChange={(v) => updateSection("security", { whoCanMessage: v })}
            options={[
              { value: "everyone", label: "Everyone" },
              { value: "contacts", label: "Contacts" },
            ]}
          />
          <ToggleRow
            label="Read receipts (✓✓)"
            value={readReceipts}
            onChange={(v) => updateSection("chat", { readReceiptsEnabled: v })}
          />
          <ToggleRow
            label="Typing indicator"
            value={typingIndicator}
            onChange={(v) => updateSection("chat", { typingIndicatorEnabled: v })}
          />
          <SelectRow
            label="Media auto-download"
            value={mediaDl}
            onChange={(v) => updateSection("chat", { mediaDownload: v })}
            options={[
              { value: "wifi", label: "Wi‑Fi only" },
              { value: "always", label: "Always" },
              { value: "never", label: "Never" },
            ]}
          />
        </div>
      )}

      {active === "notifications" && (
        <div className="gtn-settings-panel phone-panel-scroll">
          <MessageNotificationSettings userSignedIn />
          <ToggleRow
            label="Calls"
            value={notifyCalls}
            onChange={(v) => updateSection("notifications", { calls: v })}
          />
          <ToggleRow
            label="Messages"
            value={notifyMessages}
            onChange={(v) => updateSection("notifications", { messages: v })}
          />
          <ToggleRow
            label="Voice room invites"
            value={notifyRooms}
            onChange={(v) => updateSection("notifications", { voiceRoomInvites: v })}
          />
          <ToggleRow
            label="Referral rewards"
            value={notifyReferral}
            onChange={(v) => updateSection("notifications", { referralRewards: v })}
          />
          <ToggleRow
            label="Plan activity"
            value={notifyPlans}
            onChange={(v) => updateSection("notifications", { planActivity: v })}
          />
          <hr className="gtn-settings-divider" />
          <ToggleRow
            label="Sound"
            value={notifySound}
            onChange={(v) => updateSection("notifications", { sound: v })}
          />
          <ToggleRow
            label="Vibration"
            value={notifyVibrate}
            onChange={(v) => updateSection("notifications", { vibration: v })}
          />
          <p className="gtn-settings-hint">Browser notifications use system sound. Mobile app will map vibration.</p>
        </div>
      )}

      {active === "referral" && (
        <div className="gtn-settings-panel gtn-settings-panel--embed phone-panel-scroll">
          <InviteReferral user={user} />
        </div>
      )}

      {active === "data" && (
        <div className="gtn-settings-panel phone-panel-scroll">
          <ToggleRow
            label="Data saver (low bandwidth)"
            value={dataSaver}
            onChange={(v) => updateSection("data", { dataSaver: v })}
          />
          <button type="button" className="gtn-settings-action-btn" onClick={clearCache}>
            Clear GTN cache (prefs only)
          </button>
          <div className="gtn-settings-field">
            <label>Storage usage</label>
            <div className="gtn-settings-value muted">Estimate unavailable in browser</div>
          </div>
        </div>
      )}

      {active === "appearance" && (
        <div className="gtn-settings-panel phone-panel-scroll">
          <SelectRow
            label="Theme"
            value={themeMode}
            onChange={onThemeSelect}
            options={[
              { value: "dark", label: "Dark" },
              { value: "light", label: "Light" },
              { value: "auto", label: "Auto (system)" },
            ]}
          />
          <SelectRow
            label="Font size"
            value={fontSize}
            onChange={onFontSize}
            options={[
              { value: "small", label: "Small" },
              { value: "medium", label: "Medium" },
              { value: "large", label: "Large" },
            ]}
          />
        </div>
      )}

      {active === "about" && (
        <div className="gtn-settings-panel phone-panel-scroll">
          <AboutBody className="gtn-settings-legal-prose" />
        </div>
      )}

      {active === "privacy" && (
        <div className="gtn-settings-panel phone-panel-scroll">
          <PrivacyBody className="gtn-settings-legal-prose" />
        </div>
      )}

      {active === "terms" && (
        <div className="gtn-settings-panel phone-panel-scroll">
          <TermsBody className="gtn-settings-legal-prose" />
        </div>
      )}

      {active === "contact" && (
        <div className="gtn-settings-panel phone-panel-scroll">
          <ContactBody variant="compact" />
        </div>
      )}

      {active === "support" && (
        <div className="gtn-settings-panel phone-panel-scroll">
          <p className="gtn-settings-hint">
            About, Privacy, Terms, and Contact are in the sections above in Settings.
          </p>
          <button type="button" className="gtn-settings-action-btn" disabled>
            Customer care (coming soon)
          </button>
          <button type="button" className="gtn-settings-action-btn" disabled>
            FAQ
          </button>
          <button type="button" className="gtn-settings-action-btn" disabled>
            Report a problem
          </button>
          <div className="gtn-settings-field">
            <label>App version</label>
            <div className="gtn-settings-value muted">GTN Web 1.0</div>
          </div>
        </div>
      )}
    </div>
  );
}
