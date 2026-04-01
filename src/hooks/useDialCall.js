"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "@/services/api";
import { useLocale } from "@/contexts/localeContext";
import { normalizeDialPhone, useVoiceCall } from "@/contexts/voiceCallContext";

function canPlaceCallWithoutBalance() {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_CALL_ALLOW_ZERO_BALANCE === "true") {
    return true;
  }
  if (typeof process !== "undefined" && process.env.NODE_ENV === "development") {
    return true;
  }
  return false;
}

/**
 * GTN dial-out: server checks unlimited plan first, then free minutes.
 * POST /calls/start only succeeds if caller can pay the first minute.
 */
export function useDialCall(user) {
  const { countryPrefix } = useLocale();
  const voice = useVoiceCall();
  const [freeMinutes, setFreeMinutes] = useState(0);
  const [canStart, setCanStart] = useState(true);
  const [planUnlimited, setPlanUnlimited] = useState(false);
  const [prepLoaded, setPrepLoaded] = useState(false);
  const [balanceFetchFailed, setBalanceFetchFailed] = useState(false);
  const [lastCallAttempt, setLastCallAttempt] = useState(null);
  const allowZeroBalance = useMemo(() => canPlaceCallWithoutBalance(), []);

  const loadPrep = useCallback(async () => {
    if (!user?.id) return;
    setBalanceFetchFailed(false);
    try {
      const prepRes = await axios.get(`/calls/can-start`);
      setFreeMinutes(Number(prepRes.data.freeMinutes) || 0);
      setPlanUnlimited(Boolean(prepRes.data.planUnlimited));
      setCanStart(prepRes.data.canStart !== false);
    } catch {
      setBalanceFetchFailed(true);
      setCanStart(false);
    } finally {
      setPrepLoaded(true);
    }
  }, [user?.id]);

  useEffect(() => {
    void loadPrep();
  }, [loadPrep]);

  const voiceBusy = Boolean(voice && voice.callState !== "idle" && voice.callState !== "incoming");

  const callNumber = useCallback(
    async (rawNumber) => {
      if (!rawNumber || !user?.id) return { ok: false, reason: "no_user" };
      const number = String(rawNumber).trim();
      if (!/\d/.test(number)) {
        console.warn("[GTN dial]", "Enter a valid number with digits.");
        return { ok: false, reason: "no_digits" };
      }
      if (countryPrefix && String(number) === countryPrefix) {
        console.warn("[GTN dial]", "Add digits after the country code.");
        return { ok: false, reason: "prefix_only" };
      }
      if (prepLoaded && balanceFetchFailed && !allowZeroBalance) {
        console.warn("[GTN dial]", "Could not load call eligibility.");
        return { ok: false, reason: "balance" };
      }
      if (prepLoaded && !balanceFetchFailed && !allowZeroBalance && !canStart) {
        console.warn("[GTN dial]", "Insufficient minutes to start call.");
        return { ok: false, reason: "plans" };
      }
      let normalized;
      try {
        normalized = normalizeDialPhone(number);
      } catch {
        console.warn("[GTN dial]", "Use a full international number (+country…).");
        return { ok: false, reason: "normalize" };
      }
      if (String(normalized) === String(user.id)) {
        console.warn("[GTN dial]", "Cannot call your own number.");
        return { ok: false, reason: "self" };
      }

      let callId;
      let receiverUserId;
      try {
        const startRes = await axios.post("/calls/start", { receiverPhone: normalized });
        callId = startRes?.data?.id;
        receiverUserId = startRes?.data?.receiverUserId ?? startRes?.data?.receiverUserID ?? null;
        setLastCallAttempt({
          at: Date.now(),
          callId: callId ?? null,
          receiverPhone: normalized,
          receiverUserId: receiverUserId ?? null,
        });
      } catch (err) {
        console.error("Call failed:", err);
        const data = err?.data ?? err?.response?.data;
        const msg = (data && (data.error || data.message)) || err?.message || "Call failed.";
        console.warn("[GTN dial]", msg);
        if (data?.code === "INSUFFICIENT_FUNDS") {
          return { ok: false, reason: "plans", message: msg };
        }
        return { ok: false, reason: "api", message: msg };
      }

      if (voice?.startOutgoing) {
        try {
          await voice.startOutgoing(normalized, callId, receiverUserId);
        } catch (webrtcErr) {
          const msg = webrtcErr?.message || "Browser voice could not start.";
          // Keep this non-scary for “no mic device” cases; treat it as a normal environment issue.
          if (
            webrtcErr?.name === "NotFoundError" ||
            msg.includes("No microphone device found") ||
            msg.includes("Requested device not found")
          ) {
            console.warn("[GTN dial]", msg);
            return { ok: false, reason: "mic", message: msg };
          }
          console.warn("[GTN dial]", msg);
          return { ok: false, reason: "webrtc", message: msg };
        }
      }
      return { ok: true };
    },
    [user, countryPrefix, prepLoaded, balanceFetchFailed, allowZeroBalance, canStart, voice]
  );

  const refreshBalance = useCallback(async () => {
    await loadPrep();
  }, [loadPrep]);

  return {
    callNumber,
    voiceBusy,
    voice,
    refreshBalance,
    freeMinutes,
    canStart,
    planUnlimited,
    prepLoaded,
    balanceFetchFailed,
    allowZeroBalance,
    lastCallAttempt,
  };
}
