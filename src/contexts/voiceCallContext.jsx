"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Peer from "simple-peer";
import axios from "@/services/api";
import { useChatSocket } from "@/contexts/chatSocketContext";
import { fetchRtcConfigurationFromApi } from "@/lib/webrtcConfig";
import {
  acquireMicStream,
  applyRemoteAudioSinkPreference,
  getOutboundAudioMaxBitrateBps,
  getVoiceMediaPrefs,
  scheduleSimplePeerAudioBitrateTuning,
} from "@/lib/voiceMediaPreferences";

const VoiceCallContext = createContext(null);

/** E.164-ish normalization aligned with backend */
export function normalizeDialPhone(raw) {
  let s = String(raw || "").trim().replace(/\s/g, "");
  if (!s) throw new Error("Number is required");
  if (!s.startsWith("+")) s = `+${s.replace(/^\+/, "")}`;
  return s.slice(0, 20);
}

export function VoiceCallProvider({ user, children }) {
  const { socketRef } = useChatSocket();
  // "fromUserId" must be a phone identity (E.164-ish), not a domain/user id.
  const myPhone = (() => {
    const raw =
      user?.phoneNumber ??
      user?.phone ??
      (user?.subscriberId && user?.countryPrefix
        ? `${user.countryPrefix}${user.subscriberId}`
        : user?.subscriberId
          ? `+256${user.subscriberId}`
          : null);
    if (!raw) return null;
    try {
      return normalizeDialPhone(raw);
    } catch {
      return null;
    }
  })();

  const peerRef = useRef(null);
  const incomingFromRef = useRef(null);
  const incomingFromDbIdRef = useRef(null);
  const incomingCallIdRef = useRef(null);
  const activeCallIdRef = useRef(null);
  const callConnectedAtRef = useRef(null);
  const pendingSignalsRef = useRef([]);
  const callPartnerRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const billingIntervalRef = useRef(null);
  const billingMinuteRef = useRef(0);
  /** Caller pays per-minute; callee never runs billing ticks */
  const isOutboundRef = useRef(false);

  /** idle | dialing | incoming | connected */
  const [callState, setCallState] = useState("idle");
  const [incomingFrom, setIncomingFrom] = useState(null);
  const [remoteLabel, setRemoteLabel] = useState("");
  const [lastRoute, setLastRoute] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [lastSignalFailure, setLastSignalFailure] = useState(null);

  const voiceMediaPrefs = useMemo(() => getVoiceMediaPrefs(user), [user]);

  const getAudioStreamSafe = useCallback(async () => acquireMicStream(voiceMediaPrefs), [voiceMediaPrefs]);

  const stopBilling = useCallback(() => {
    if (billingIntervalRef.current) {
      clearInterval(billingIntervalRef.current);
      billingIntervalRef.current = null;
    }
    billingMinuteRef.current = 0;
  }, []);

  const startBilling = useCallback(
    (callId) => {
      stopBilling();
      const s = socketRef.current;
      if (!s?.connected || callId == null) return;

      const emitTick = (n) => {
        billingMinuteRef.current = n;
        s.emit("call_billing_tick", { callId, minuteIndex: n });
      };

      emitTick(1);
      billingIntervalRef.current = setInterval(() => {
        const next = billingMinuteRef.current + 1;
        emitTick(next);
      }, 60000);
    },
    [socketRef, stopBilling]
  );

  const cleanupPeer = useCallback(
    (notifyOther, options = {}) => {
      stopBilling();
      const { remoteEnded = false } = options;
      const partner = callPartnerRef.current;
      const s = socketRef.current;
      if (notifyOther && s?.connected && partner) {
        s.emit("end_call", { toUserId: partner });
      }

      const callIdSnapshot = activeCallIdRef.current;
      const connectedAtSnapshot = callConnectedAtRef.current;

      try {
        peerRef.current?.destroy();
      } catch {
        /* ignore */
      }
      peerRef.current = null;
      callPartnerRef.current = null;
      incomingFromRef.current = null;
      incomingFromDbIdRef.current = null;
      incomingCallIdRef.current = null;
      activeCallIdRef.current = null;
      callConnectedAtRef.current = null;
      pendingSignalsRef.current = [];
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = null;
      }

      if (!remoteEnded && callIdSnapshot != null) {
        const durationMin = connectedAtSnapshot
          ? Math.max(0, Math.ceil((Date.now() - connectedAtSnapshot) / 60000))
          : 0;
        void axios
          .post("/calls/end", { callId: callIdSnapshot, duration: durationMin })
          .catch((e) =>
            console.warn("[GTN voice] Failed to record call end", e?.message || e)
          );
      }

      setCallState("idle");
      setIncomingFrom(null);
      setRemoteLabel("");
      setLastRoute(null);
      setLastSignalFailure(null);
    },
    [socketRef, stopBilling]
  );

  const endCall = useCallback(() => {
    cleanupPeer(true);
  }, [cleanupPeer]);

  useEffect(() => {
    const s = socketRef.current;
    if (!s || !myPhone) return;

    const onConnect = () => setSocketConnected(true);
    const onDisconnect = () => setSocketConnected(false);
    setSocketConnected(Boolean(s.connected));

    const onIncoming = ({ fromUserId, fromUserDbId, signal, callId }) => {
      if (!fromUserId || signal == null) return;
      if (!peerRef.current) {
        incomingFromRef.current = fromUserId;
        incomingFromDbIdRef.current = fromUserDbId ?? null;
        if (callId != null) incomingCallIdRef.current = callId;
        setIncomingFrom(fromUserId);
        pendingSignalsRef.current.push(signal);
        setCallState("incoming");
      } else {
        peerRef.current.signal(signal);
      }
    };

    const onAnswered = (signal) => {
      if (signal != null) peerRef.current?.signal(signal);
    };

    const onEnded = () => {
      cleanupPeer(false, { remoteEnded: true });
    };

    const onFailed = ({ reason }) => {
      setLastSignalFailure({ reason: reason || "unknown", at: Date.now() });
      console.warn(
        "[GTN voice]",
        reason === "offline"
          ? "Peer offline or not connected in GTN."
          : "Call could not be connected."
      );
      cleanupPeer(false);
    };

    const onRejected = () => {
      console.warn("[GTN voice]", "Call declined.");
      cleanupPeer(false);
    };

    const onRouted = (payload) => {
      // Helps debug “silent” call failures in production.
      setLastRoute(payload || null);
      if (payload && payload.ok === false) {
        // If the server couldn't route the call, don't leave caller stuck in "dialing".
        setLastSignalFailure({ reason: payload.route || "route_failed", at: Date.now() });
        cleanupPeer(false);
      }
    };

    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    s.on("incoming_call", onIncoming);
    s.on("call_answered", onAnswered);
    s.on("call_ended", onEnded);
    s.on("call_failed", onFailed);
    s.on("call_rejected", onRejected);
    s.on("call_routed", onRouted);

    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      s.off("incoming_call", onIncoming);
      s.off("call_answered", onAnswered);
      s.off("call_ended", onEnded);
      s.off("call_failed", onFailed);
      s.off("call_rejected", onRejected);
      s.off("call_routed", onRouted);
    };
  }, [socketRef, myPhone, cleanupPeer]);

  useEffect(() => {
    const s = socketRef.current;
    if (!s) return;
    const onBillingFailed = (payload) => {
      if (payload?.error === "insufficient") {
        console.warn("[GTN voice]", "Call ended: insufficient minutes or plan expired.");
        cleanupPeer(true);
      }
    };
    s.on("call_billing_failed", onBillingFailed);
    return () => {
      s.off("call_billing_failed", onBillingFailed);
    };
  }, [socketRef, cleanupPeer]);

  const acceptIncoming = useCallback(async () => {
    const callerPhone = incomingFromRef.current;
    const s = socketRef.current;
    if (!callerPhone || !s?.connected) return;

    isOutboundRef.current = false;
    activeCallIdRef.current = incomingCallIdRef.current;
    incomingCallIdRef.current = null;

    try {
      const stream = await getAudioStreamSafe();
      stream.getAudioTracks().forEach((t) => {
        t.enabled = !voiceMediaPrefs.muteOnCallStart;
      });
      const config = await fetchRtcConfigurationFromApi();
      const peer = new Peer({
        initiator: false,
        trickle: true,
        stream,
        config,
      });
      peerRef.current = peer;
      callPartnerRef.current = callerPhone;
      scheduleSimplePeerAudioBitrateTuning(peer, getOutboundAudioMaxBitrateBps(voiceMediaPrefs));

      pendingSignalsRef.current.forEach((sig) => peer.signal(sig));
      pendingSignalsRef.current = [];

      peer.on("signal", (data) => {
        s.emit("answer_call", {
          toUserId: callerPhone,
          toUserDbId: incomingFromDbIdRef.current ?? null,
          signal: data,
        });
      });

      peer.on("stream", (remoteStream) => {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteStream;
          void applyRemoteAudioSinkPreference(remoteAudioRef.current, voiceMediaPrefs.speakerDefault);
          remoteAudioRef.current.play().catch(() => {});
        }
        if (!callConnectedAtRef.current) {
          callConnectedAtRef.current = Date.now();
        }
        setCallState("connected");
      });

      peer.on("close", () => cleanupPeer(false));
      peer.on("error", (err) => {
        console.error(err);
        console.warn("[GTN voice]", "Connection error while answering.");
        cleanupPeer(false);
      });

      setCallState("dialing");
      setIncomingFrom(null);
      setRemoteLabel(callerPhone);
      setLastRoute(null);
    } catch (e) {
      console.error(e);
      console.warn("[GTN voice]", "Microphone permission is required to answer.");
      pendingSignalsRef.current = [];
      cleanupPeer(false);
    }
  }, [socketRef, cleanupPeer, getAudioStreamSafe, voiceMediaPrefs]);

  const rejectIncoming = useCallback(() => {
    const caller = incomingFromRef.current;
    const s = socketRef.current;
    if (caller && s?.connected) {
      s.emit("reject_call", { toUserId: caller, toUserDbId: incomingFromDbIdRef.current ?? null });
    }
    pendingSignalsRef.current = [];
    incomingFromRef.current = null;
    incomingCallIdRef.current = null;
    setIncomingFrom(null);
    setCallState("idle");
  }, [socketRef]);

  const startOutgoing = useCallback(
    async (receiverPhone, callId, receiverUserId) => {
      const s = socketRef.current;
      if (!s?.connected) {
        throw new Error("Not connected to GTN. Check your network.");
      }
      if (!myPhone) {
        throw new Error("Missing your phone identity.");
      }

      const normalized =
        typeof receiverPhone === "string" && receiverPhone.startsWith("+")
          ? receiverPhone
          : normalizeDialPhone(receiverPhone);

      if (normalized === myPhone) {
        throw new Error("You can’t call your own number.");
      }

      cleanupPeer(false);
      isOutboundRef.current = true;
      activeCallIdRef.current = callId ?? null;
      callConnectedAtRef.current = null;

      let stream;
      try {
        stream = await getAudioStreamSafe();
      } catch (e) {
        cleanupPeer(false);
        throw e;
      }
      stream.getAudioTracks().forEach((t) => {
        t.enabled = !voiceMediaPrefs.muteOnCallStart;
      });

      const config = await fetchRtcConfigurationFromApi();
      const peer = new Peer({
        initiator: true,
        trickle: true,
        stream,
        config,
      });
      peerRef.current = peer;
      callPartnerRef.current = normalized;
      scheduleSimplePeerAudioBitrateTuning(peer, getOutboundAudioMaxBitrateBps(voiceMediaPrefs));

      peer.on("signal", (data) => {
        s.emit("call_user", {
          fromUserId: myPhone,
          toUserId: normalized,
          toUserDbId: receiverUserId ?? null,
          signal: data,
          callId,
        });
      });

      peer.on("stream", (remoteStream) => {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteStream;
          void applyRemoteAudioSinkPreference(remoteAudioRef.current, voiceMediaPrefs.speakerDefault);
          remoteAudioRef.current.play().catch(() => {});
        }
        if (!callConnectedAtRef.current) {
          callConnectedAtRef.current = Date.now();
        }
        setCallState("connected");
        if (isOutboundRef.current && activeCallIdRef.current != null) {
          startBilling(activeCallIdRef.current);
        }
      });

      peer.on("close", () => cleanupPeer(false));
      peer.on("error", (err) => {
        console.error(err);
        console.warn("[GTN voice]", "Call failed.");
        cleanupPeer(false);
      });

      setRemoteLabel(normalized);
      setCallState("dialing");
      setLastRoute(null);
    },
    [myPhone, socketRef, cleanupPeer, startBilling, getAudioStreamSafe, voiceMediaPrefs]
  );

  const value = {
    callState,
    remoteLabel,
    incomingFrom,
    lastRoute,
    socketConnected,
    lastSignalFailure,
    startOutgoing,
    acceptIncoming,
    rejectIncoming,
    endCall,
    myPhone,
  };

  return (
    <VoiceCallContext.Provider value={value}>
      {children}
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
        className="gtn-voice-remote-audio"
        aria-hidden
      />

      {callState === "incoming" && incomingFrom && (
        <div className="gtn-incoming-overlay" role="dialog" aria-modal="true" aria-label="Incoming call">
          <div className="gtn-incoming-card">
            <p className="gtn-incoming-from">{incomingFrom}</p>
            <div className="gtn-incoming-actions">
              <button
                type="button"
                className="gtn-incoming-decline"
                onClick={rejectIncoming}
                aria-label="Decline"
              >
                <span aria-hidden>×</span>
              </button>
              <button
                type="button"
                className="gtn-incoming-accept"
                onClick={acceptIncoming}
                aria-label="Accept"
              >
                <span aria-hidden>✓</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </VoiceCallContext.Provider>
  );
}

export function useVoiceCall() {
  return useContext(VoiceCallContext);
}
