"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Peer from "simple-peer";
import axios from "@/services/api";
import ReferralInviteShare from "@/components/ReferralInviteShare";
import { useChatSocket } from "@/contexts/chatSocketContext";
import { fetchRtcConfigurationFromApi } from "@/lib/webrtcConfig";
import {
  acquireMicStream,
  applyRemoteAudioSinkPreference,
  getOutboundAudioMaxBitrateBps,
  getVoiceMediaPrefs,
  scheduleSimplePeerAudioBitrateTuning,
} from "@/lib/voiceMediaPreferences";

const REACTIONS = ["👏", "❤️", "🔥", "🎉", "👍"];

/**
 * WebRTC mesh + voice room billing (speaking / unmuted only), chat & reactions.
 */
export default function VoiceRoomSession({
  roomId,
  userDbId,
  onLeave,
  inviteRefCode,
  inviteSource = "voice_room",
  inviteMeta = "",
  user,
  onNavigateToMessages,
}) {
  const { socket, socketRef } = useChatSocket();
  const [status, setStatus] = useState("connecting");
  const [error, setError] = useState("");
  const [muted, setMuted] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [roomInfo, setRoomInfo] = useState(null);
  const localStreamRef = useRef(null);
  const peersRef = useRef(new Map());
  const remoteContainerRef = useRef(null);
  const removeListenersRef = useRef(() => {});
  const billingIntervalRef = useRef(null);
  const billingMinuteRef = useRef(0);
  const chatEndRef = useRef(null);
  const userRef = useRef(user);
  userRef.current = user;

  const voiceMediaPrefsKey = useMemo(
    () =>
      [
        user?.preferences?.voice?.callQuality,
        user?.preferences?.voice?.muteOnCallStart,
        user?.preferences?.voice?.speakerDefault,
        user?.preferences?.data?.dataSaver,
      ].join("|"),
    [
      user?.preferences?.voice?.callQuality,
      user?.preferences?.voice?.muteOnCallStart,
      user?.preferences?.voice?.speakerDefault,
      user?.preferences?.data?.dataSaver,
    ]
  );

  const stopBilling = useCallback(() => {
    if (billingIntervalRef.current) {
      clearInterval(billingIntervalRef.current);
      billingIntervalRef.current = null;
    }
    billingMinuteRef.current = 0;
    const s = socketRef.current;
    if (s?.connected && roomId) {
      s.emit("voice_room:speaking_stop", roomId);
    }
  }, [socketRef, roomId]);

  const startBilling = useCallback(() => {
    stopBilling();
    const s = socketRef.current;
    if (!s?.connected || !roomId) return;
    const emitTick = (n) => {
      billingMinuteRef.current = n;
      s.emit("voice_room:speaking_tick", { roomId, minuteIndex: n });
    };
    s.emit("voice_room:speaking_start", roomId);
    const onOk = () => {
      s.off("voice_room:speaking_ok", onOk);
      s.off("voice_room:speaking_denied", onDenied);
      emitTick(1);
      billingIntervalRef.current = setInterval(() => {
        emitTick(billingMinuteRef.current + 1);
      }, 60000);
    };
    const onDenied = (p) => {
      s.off("voice_room:speaking_ok", onOk);
      s.off("voice_room:speaking_denied", onDenied);
      setError(p?.error || "Cannot start paid speaking in this room.");
    };
    s.once("voice_room:speaking_ok", onOk);
    s.once("voice_room:speaking_denied", onDenied);
  }, [socketRef, roomId, stopBilling]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const s = socketRef.current;
    if (!s) return;
    const onChat = (msg) => {
      if (msg?.roomId != null && String(msg.roomId) !== String(roomId)) return;
      setMessages((m) => [...m, msg]);
    };
    const onBillingFail = (payload) => {
      if (payload?.error === "insufficient") {
        setMuted(true);
        localStreamRef.current?.getAudioTracks().forEach((t) => {
          t.enabled = false;
        });
        stopBilling();
        setError("Insufficient minutes — mic muted. Upgrade your plan or earn free minutes.");
      }
    };
    s.on("voice_room:chat_message", onChat);
    s.on("voice_room:billing_failed", onBillingFail);
    return () => {
      s.off("voice_room:chat_message", onChat);
      s.off("voice_room:billing_failed", onBillingFail);
    };
  }, [socketRef, roomId, stopBilling]);

  useEffect(() => {
    const s = socketRef.current;
    if (!userDbId || !roomId) {
      setError("Missing session.");
      setStatus("error");
      return undefined;
    }
    if (!s?.connected) {
      setStatus("connecting");
      return undefined;
    }

    let cancelled = false;
    removeListenersRef.current = () => {};

    const destroyPeer = (peerDbId) => {
      const p = peersRef.current.get(peerDbId);
      if (p) {
        peersRef.current.delete(peerDbId);
        try {
          p.destroy();
        } catch {
          /* ignore */
        }
      }
      remoteContainerRef.current?.querySelector(`[data-peer="${peerDbId}"]`)?.remove();
    };

    const cleanupAllPeers = () => {
      peersRef.current.forEach((_, id) => destroyPeer(id));
      peersRef.current.clear();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      if (remoteContainerRef.current) remoteContainerRef.current.innerHTML = "";
    };

    const run = async () => {
      const s = socketRef.current;
      if (!s?.connected) return;
      const voiceMediaPrefs = getVoiceMediaPrefs(userRef.current);
      const maxOutAudioBps = getOutboundAudioMaxBitrateBps(voiceMediaPrefs);
      try {
        await axios.post(`/voice-rooms/${encodeURIComponent(roomId)}/join`, { mode: "speak" });
        const [roomRes, msgRes] = await Promise.all([
          axios.get(`/voice-rooms/${encodeURIComponent(roomId)}`),
          axios.get(`/voice-rooms/${encodeURIComponent(roomId)}/messages?limit=40`),
        ]);
        if (cancelled) return;
        setRoomInfo(roomRes.data);
        setMessages(Array.isArray(msgRes.data) ? msgRes.data : []);

        const stream = await acquireMicStream(voiceMediaPrefs);
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const muteOnStart = voiceMediaPrefs.muteOnCallStart;
        stream.getAudioTracks().forEach((t) => {
          t.enabled = !muteOnStart;
        });
        setMuted(muteOnStart);
        localStreamRef.current = stream;
        const config = await fetchRtcConfigurationFromApi();
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        const createPeerFor = (peerDbId, isInitiator) => {
          if (peersRef.current.has(peerDbId)) return;
          const peer = new Peer({
            initiator: isInitiator,
            trickle: true,
            stream,
            config,
          });
          peersRef.current.set(peerDbId, peer);
          scheduleSimplePeerAudioBitrateTuning(peer, maxOutAudioBps);

          peer.on("signal", (signal) => {
            const sock = socketRef.current;
            if (!sock?.connected) return;
            sock.emit("voice_room:signal", {
              roomId,
              toUserId: peerDbId,
              signal,
            });
          });

          peer.on("stream", (remoteStream) => {
            let wrap = remoteContainerRef.current?.querySelector(`[data-peer="${peerDbId}"]`);
            if (!wrap) {
              wrap = document.createElement("div");
              wrap.setAttribute("data-peer", String(peerDbId));
              remoteContainerRef.current?.appendChild(wrap);
            }
            let audio = wrap.querySelector("audio");
            if (!audio) {
              audio = document.createElement("audio");
              audio.autoplay = true;
              audio.playsInline = true;
              audio.setAttribute("aria-label", `Participant ${peerDbId}`);
              wrap.appendChild(audio);
            }
            audio.srcObject = remoteStream;
            void applyRemoteAudioSinkPreference(audio, voiceMediaPrefs.speakerDefault);
          });

          peer.on("close", () => {
            destroyPeer(peerDbId);
          });
          peer.on("error", (err) => console.warn("[voice room]", err));
        };

        const onPeers = ({ userIds }) => {
          if (!Array.isArray(userIds)) return;
          userIds.forEach((pid) => {
            const id = Number(pid);
            if (!Number.isFinite(id) || id === userDbId) return;
            createPeerFor(id, userDbId < id);
          });
        };

        const onPeerJoined = ({ userId }) => {
          const id = Number(userId);
          if (!Number.isFinite(id) || id === userDbId) return;
          createPeerFor(id, userDbId < id);
        };

        const onPeerLeft = ({ userId }) => {
          const id = Number(userId);
          if (!Number.isFinite(id)) return;
          destroyPeer(id);
        };

        const onSignal = ({ fromUserId, signal }) => {
          const id = Number(fromUserId);
          if (!Number.isFinite(id) || id === userDbId) return;
          let peer = peersRef.current.get(id);
          if (!peer) {
            if (userDbId < id) return;
            createPeerFor(id, false);
            peer = peersRef.current.get(id);
          }
          try {
            peer?.signal(signal);
          } catch (e) {
            console.warn("[voice room] signal", e);
          }
        };

        s.on("voice_room:peers", onPeers);
        s.on("voice_room:peer_joined", onPeerJoined);
        s.on("voice_room:peer_left", onPeerLeft);
        s.on("voice_room:signal", onSignal);

        removeListenersRef.current = () => {
          s.off("voice_room:peers", onPeers);
          s.off("voice_room:peer_joined", onPeerJoined);
          s.off("voice_room:peer_left", onPeerLeft);
          s.off("voice_room:signal", onSignal);
        };

        s.emit("voice_room:join", roomId);
        setStatus("live");
        if (!muteOnStart) {
          startBilling();
        }
      } catch (e) {
        console.error(e);
        setError(
          (e?.data && (e.data.error || e.data.message)) ||
            e?.response?.data?.error ||
            e?.message ||
            "Could not join room"
        );
        setStatus("error");
      }
    };

    void run();

    return () => {
      cancelled = true;
      stopBilling();
      removeListenersRef.current();
      const sock = socketRef.current;
      if (sock?.connected) {
        sock.emit("voice_room:leave", roomId);
      }
      void axios.post(`/voice-rooms/${encodeURIComponent(roomId)}/leave`).catch(() => {});
      cleanupAllPeers();
    };
  }, [roomId, userDbId, socketRef, socket?.connected, startBilling, stopBilling, voiceMediaPrefsKey]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    localStreamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !next;
    });
    if (next) {
      stopBilling();
    } else {
      startBilling();
    }
  };

  const sendChat = (e) => {
    e?.preventDefault?.();
    const text = chatInput.trim();
    if (!text || !socketRef.current?.connected) return;
    socketRef.current.emit("voice_room:chat", { roomId, content: text });
    setChatInput("");
  };

  const sendReaction = (emoji) => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit("voice_room:reaction", { roomId, emoji });
  };

  const planLabel = user?.planName || (user?.planUnlimited ? "Unlimited" : "Free Plan");

  return (
    <div className="voice-room-session voice-room-session--full">
      <div className="voice-room-session__bar">
        <div className="voice-room-session__head">
          <span className="voice-room-session__topic">{roomInfo?.name || "Room"}</span>
          <span className="voice-room-session__plan" aria-label="Plan and minutes">
            {planLabel}
            {user?.planUnlimited ? "" : user?.freeMinutes >= 1 ? ` · ${Math.floor(user.freeMinutes)} free min` : " · 0 min"}
          </span>
        </div>
        <div className="voice-room-session__bar-actions">
          {inviteRefCode != null && String(inviteRefCode).trim() !== "" ? (
            <ReferralInviteShare
              refCode={inviteRefCode}
              source={inviteSource}
              meta={inviteMeta}
              layout="compact"
              className="voice-room-session__invite-share"
            />
          ) : null}
          {typeof onNavigateToMessages === "function" ? (
            <button
              type="button"
              className="voice-room-session__invite-chat"
              onClick={() => {
                try {
                  sessionStorage.setItem(
                    "gtn_pending_voice_room_invite_out",
                    JSON.stringify({
                      roomId,
                      roomName: roomInfo?.name || "Room",
                    })
                  );
                } catch {
                  /* ignore */
                }
                onNavigateToMessages();
              }}
            >
              Invite via chat
            </button>
          ) : null}
          <button type="button" className="voice-room-session__mute" onClick={toggleMute} aria-pressed={muted}>
            {muted ? "Unmute" : "Mute"}
          </button>
          <button
            type="button"
            className="voice-room-session__leave"
            onClick={() => {
              stopBilling();
              onLeave?.();
            }}
          >
            Leave
          </button>
        </div>
      </div>

      {roomInfo?.participants?.length ? (
        <ul className="voice-room-session__participants" aria-label="Participants">
          {roomInfo.participants.map((p) => (
            <li key={`${p.userId}-${p.joinedAt}`}>
              <span className={`vr-role vr-role--${p.role}`}>{p.role}</span>
              <span className="vr-name">{p.user?.name || p.userId}</span>
              {p.muted ? <span className="vr-muted">muted</span> : null}
            </li>
          ))}
        </ul>
      ) : null}

      <p className="voice-room-session__status-line" aria-live="polite">
        {status === "live" && "● Live — unmuted = billed per minute (free minutes first)"}
        {status === "connecting" && "Connecting…"}
        {status === "error" && "Couldn’t join"}
      </p>

      {error && <p className="voice-room-session__err">{error}</p>}

      <div ref={remoteContainerRef} className="voice-room-session__remote" aria-hidden />

      <div className="voice-room-session__reactions" aria-label="Quick reactions">
        {REACTIONS.map((e) => (
          <button key={e} type="button" className="vr-react-btn" onClick={() => sendReaction(e)}>
            {e}
          </button>
        ))}
      </div>

      <button
        type="button"
        className="voice-room-session__chat-toggle"
        onClick={() => setChatOpen((o) => !o)}
        aria-expanded={chatOpen}
      >
        {chatOpen ? "Hide chat" : "Chat"}
      </button>

      {chatOpen && (
        <div className="voice-room-session__chat">
          <ul className="voice-room-session__messages">
            {messages.map((m) => (
              <li key={m.id} className={m.senderId === userDbId ? "vr-msg--self" : ""}>
                <span className="vr-msg-body">{m.content}</span>
              </li>
            ))}
            <li ref={chatEndRef} />
          </ul>
          <form className="voice-room-session__chat-form" onSubmit={sendChat}>
            <input
              className="voice-room-session__chat-input"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value.slice(0, 2000))}
              placeholder="Message (free)"
              aria-label="Room chat"
            />
            <button type="submit" className="voice-room-session__chat-send">
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
