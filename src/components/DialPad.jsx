"use client";

import { useState, useEffect, useMemo } from "react";
import { IoCallOutline, IoPeopleOutline } from "react-icons/io5";
import axios from "@/services/api";
import SmartKeyboard from "@/components/SmartKeyboard";
import GuestAuthPrompt from "@/components/GuestAuthPrompt";
import ZeroBalanceReferralModal from "@/components/ZeroBalanceReferralModal";
import { useLocale } from "@/contexts/localeContext";
import { useContacts } from "@/contexts/contactsContext";
import { useDialCall } from "@/hooks/useDialCall";

export default function DialPad({ user, onOpenContactsSettings }) {
  const { countryPrefix, currencySymbol, currencyCode } = useLocale();
  const moneyLabel = currencySymbol || currencyCode || "";
  const [number, setNumber] = useState("");
  const [callHistory, setCallHistory] = useState([]);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [zeroBalanceModal, setZeroBalanceModal] = useState(false);
  const [voiceError, setVoiceError] = useState("");

  const {
    callNumber,
    voiceBusy,
    voice,
    refreshBalance,
    freeMinutes,
    planUnlimited,
    prepLoaded,
    balanceFetchFailed,
    allowZeroBalance,
    lastCallAttempt,
  } = useDialCall(user);

  const { lastSyncedAt } = useContacts();
  const showContactsRemind = useMemo(() => {
    if (!user?.dbId) return false;
    try {
      if (typeof window !== "undefined" && window.localStorage.getItem("gtn_pref_contacts_auto_remind") === "0") {
        return false;
      }
    } catch {
      /* ignore */
    }
    if (!lastSyncedAt) return true;
    return Date.now() - lastSyncedAt > 7 * 86400000;
  }, [user?.dbId, lastSyncedAt]);

  useEffect(() => {
    const onSetNumber = (e) => {
      const phone = e.detail?.phone;
      if (typeof phone === "string" && phone.trim()) {
        setNumber(phone.trim().slice(0, 20));
        setShowKeyboard(true);
      }
    };
    window.addEventListener("gtn-dial-set-number", onSetNumber);
    return () => window.removeEventListener("gtn-dial-set-number", onSetNumber);
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    fetchHistory();
  }, [user?.id]);

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`/calls/history`);
      setCallHistory(res.data);
    } catch (err) {
      console.error("Failed to fetch call history:", err);
    }
  };

  const pressKey = (key) => {
    if (key === "BACK") {
      setNumber((prev) => {
        if (!prev) return prev;
        if (prev === countryPrefix) return "";
        return prev.slice(0, -1);
      });
      return;
    }
    if (key === "SPACE" || key === "SEND") return;
    setNumber((prev) => {
      const current = prev || "";
      if (!current) {
        if (/^\d$/.test(String(key))) return `${countryPrefix}${key}`.slice(0, 20);
        if (key === "+") return countryPrefix.slice(0, 20);
      }
      return (current + key).slice(0, 20);
    });
  };

  const startCall = async (raw) => {
    const target = raw != null ? raw : number;
    setVoiceError("");
    const result = await callNumber(target);
    if (result?.ok) {
      if (raw == null) {
        setNumber("");
        setShowKeyboard(false);
      }
      await refreshBalance();
      fetchHistory();
      return;
    } else if (result?.reason === "plans") {
      setZeroBalanceModal(true);
    } else if (result?.reason === "mic") {
      setVoiceError(result?.message || "Microphone not available.");
    } else if (result?.message) {
      setVoiceError(result.message);
    }
  };

  const balanceChipLabel = !user?.id
    ? "Plan"
    : !prepLoaded
      ? "Loading…"
      : balanceFetchFailed
        ? "Status unavailable"
        : planUnlimited
          ? "Unlimited active"
          : freeMinutes >= 1
            ? `${Math.floor(freeMinutes)} free min`
            : "No minutes";

  const canTapCall = Boolean(user?.id && !voiceBusy);
  const showCallDebug =
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_CALL_DEBUG === "true";

  return (
    <div className="phone-screen phone-screen-dark">
      <ZeroBalanceReferralModal
        open={zeroBalanceModal}
        onClose={() => setZeroBalanceModal(false)}
        user={user}
      />
      <div className="dial-header" aria-hidden="true" />

      {!user?.id && <GuestAuthPrompt />}

      <div className="dial-balance-chip" aria-label={balanceChipLabel}>
        {!user?.id
          ? "—"
          : !prepLoaded
            ? "…"
            : balanceFetchFailed
              ? "—"
              : planUnlimited
                ? "Unlimited"
                : freeMinutes >= 1
                  ? `${Math.floor(freeMinutes)} free`
                  : "0"}
      </div>

      {voice && voice.callState !== "idle" && voice.callState !== "incoming" && (
        <div className="dial-active-call">
          <div className="dial-active-call-row">
            <span className="dial-active-call-num">{voice.remoteLabel || "…"}</span>
          </div>
          {voice.callState === "connected" && user?.id && (
            <p className="dial-billing-hint" role="status">
              Unlimited plan or free minutes are used for calls.
            </p>
          )}
          <button
            type="button"
            className="dial-end-call"
            onClick={() => voice.endCall()}
            aria-label="End call"
          >
            <span aria-hidden>×</span>
          </button>
        </div>
      )}

      {user?.dbId && onOpenContactsSettings && showContactsRemind ? (
        <button type="button" className="dial-contacts-remind" onClick={onOpenContactsSettings}>
          Sync contacts
        </button>
      ) : null}

      <div className="dial-history">
        <h3 className="sr-only">Recent calls</h3>
        <ul aria-label="Recent calls">
          {callHistory.slice(0, 5).map((c) => {
            const currentPhone = user?.id;
            const otherPhone = c?.callerPhone === currentPhone ? c?.receiverPhone : c?.callerPhone;
            const durationMin = c?.duration ?? 0;
            return (
              <li key={c.id} className="dial-history-row">
                <button
                  type="button"
                  className="dial-history-call"
                  disabled={!canTapCall || !otherPhone}
                  onClick={() => void startCall(otherPhone)}
                  aria-label={`Call ${otherPhone}`}
                  title="Call"
                >
                  <IoCallOutline size={18} aria-hidden />
                </button>
                <span className="dial-history-num">{otherPhone}</span>
                <span className="dial-history-meta">{durationMin > 0 ? String(durationMin) : ""}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="dial-input-row">
        <button
          type="button"
          className="dial-inline-call"
          disabled={!canTapCall || !number.trim()}
          onClick={() => void startCall()}
          aria-label="Call"
          title="Call"
        >
          <IoCallOutline size={22} aria-hidden />
        </button>
        <div className="dial-input-wrap">
          <input
            type="text"
            className="msg-composer-input dial-field-input"
            value={number}
            placeholder={countryPrefix}
            onFocus={() => setShowKeyboard(true)}
            onClick={() => setShowKeyboard(true)}
            onChange={(e) => {
              const raw = e.target.value || "";
              const cleaned = raw.replace(/[^0-9*+#]/g, "").slice(0, 20);
              if (!cleaned) {
                setNumber("");
                return;
              }
              if (!cleaned.startsWith("+") && /^\d+$/.test(cleaned)) {
                const digitsPrefix = countryPrefix?.startsWith("+") ? countryPrefix.slice(1) : countryPrefix;
                if (digitsPrefix && cleaned.startsWith(String(digitsPrefix))) {
                  setNumber(`+${cleaned}`.slice(0, 20));
                  return;
                }
                setNumber(`${countryPrefix}${cleaned}`.slice(0, 20));
                return;
              }
              setNumber(cleaned);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void startCall();
                return;
              }
              if (e.key === "Escape") {
                e.preventDefault();
                setShowKeyboard(false);
              }
            }}
          />
        </div>
        {user?.dbId && onOpenContactsSettings ? (
          <button
            type="button"
            className="dial-contacts-btn"
            onClick={onOpenContactsSettings}
            aria-label="Open contacts in Settings"
            title="Contacts"
          >
            <IoPeopleOutline size={22} aria-hidden />
          </button>
        ) : null}
      </div>

      {showKeyboard && (
        <SmartKeyboard
          keyboardMode="dial"
          onChangeMode={() => {}}
          onKeyPress={pressKey}
          showModeTabs={false}
          showSpaceButton={false}
          showSendButton={false}
        />
      )}

      <div className="dial-actions">
        {voiceError ? (
          <div className="dial-webrtc-error" role="alert" aria-live="polite">
            {voiceError}
          </div>
        ) : null}
        {voice?.lastRoute && voice?.lastRoute?.ok === false ? (
          <div className="dial-webrtc-error" role="alert" aria-live="polite">
            Call routing failed: {voice.lastRoute.route || "unknown"}
          </div>
        ) : null}
        {showCallDebug ? (
          <div className="dial-webrtc-error" role="status" aria-live="polite" style={{ opacity: 0.9 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Call Debug</div>
            <div>Socket connected: {voice?.socketConnected ? "yes" : "no"}</div>
            <div>Call state: {voice?.callState || "—"}</div>
            <div>Last attempt: {lastCallAttempt?.receiverPhone || "—"}</div>
            <div>Receiver userId: {String(lastCallAttempt?.receiverUserId ?? "—")}</div>
            <div>CallId: {String(lastCallAttempt?.callId ?? "—")}</div>
            <div>
              Route:{" "}
              {voice?.lastRoute
                ? `${voice.lastRoute.ok ? "ok" : "fail"} • ${voice.lastRoute.route || "—"}`
                : "—"}
            </div>
            <div>
              Last failure:{" "}
              {voice?.lastSignalFailure?.reason
                ? `${voice.lastSignalFailure.reason}`
                : "—"}
            </div>
          </div>
        ) : null}
        <button
          type="button"
          className="dial-call-button"
          onClick={() => void startCall()}
          disabled={!canTapCall || !number.trim()}
          aria-label="Call"
        >
          Call
        </button>
      </div>
    </div>
  );
}
