"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IoSend, IoChevronBackOutline, IoPeopleOutline } from "react-icons/io5";
import axios from "@/services/api";
import MessageVoiceWaveform from "@/components/MessageVoiceWaveform";
import SmartKeyboard from "@/components/SmartKeyboard";
import GuestAuthPrompt from "@/components/GuestAuthPrompt";
import { useChatSocket } from "@/contexts/chatSocketContext";
import ReferralInviteShare from "@/components/ReferralInviteShare";
import { acquireMicStream, getVoiceMediaPrefs } from "@/lib/voiceMediaPreferences";

function statusLabel(status) {
  const s = status || "sent";
  if (s === "read") return "Read";
  if (s === "delivered") return "Delivered";
  return "Sent";
}

function formatShortTime(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    return isToday
      ? d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function parseVoiceRoomInviteDm(content) {
  try {
    const o = JSON.parse(String(content || "{}"));
    const roomId = o && typeof o.roomId === "string" ? o.roomId.trim() : "";
    if (!roomId) return null;
    const name =
      o && typeof o.name === "string" && o.name.trim()
        ? o.name.trim().slice(0, 120)
        : "Voice room";
    return { roomId, name };
  } catch {
    return null;
  }
}

function MessageTicks({ status }) {
  const s = status || "sent";
  if (s === "read") {
    return (
      <span className="msg-ticks read" title={statusLabel(s)}>
        ✓✓
      </span>
    );
  }
  if (s === "delivered") {
    return (
      <span className="msg-ticks delivered" title={statusLabel(s)}>
        ✓✓
      </span>
    );
  }
  return (
    <span className="msg-ticks sent" title={statusLabel(s)}>
      ✓
    </span>
  );
}

export default function Messages({ user, onOpenContactsSettings }) {
  const router = useRouter();
  const [peerId, setPeerId] = useState("");
  const [peerName, setPeerName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [convosLoading, setConvosLoading] = useState(false);
  /** Single-screen: chat list OR conversation (no side-by-side split). */
  const [waView, setWaView] = useState("list");

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  /** Always in sync with the composer text (avoids stale state when keyboard send fires). */
  const draftInputRef = useRef("");
  const [loading, setLoading] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [keyboardMode, setKeyboardMode] = useState("lower");
  const [peerTyping, setPeerTyping] = useState(false);
  const typingTimeoutRef = useRef(null);
  const typingEmitRef = useRef(null);
  const { socket, socketRef } = useChatSocket();

  const prefs = user?.preferences;
  const chatReadReceiptsOn = prefs?.chat?.readReceiptsEnabled !== false;
  const chatTypingOn = prefs?.chat?.typingIndicatorEnabled !== false;

  useEffect(() => {
    if (!chatTypingOn) setPeerTyping(false);
  }, [chatTypingOn]);

  const [recording, setRecording] = useState(false);
  const [voiceBusy, setVoiceBusy] = useState(false);
  /** From voice room “Invite via chat” (sessionStorage). */
  const [pendingRoomInvite, setPendingRoomInvite] = useState(null);
  const mediaRecorderRef = useRef(null);
  const mediaChunksRef = useRef([]);
  const streamRef = useRef(null);

  const listRef = useRef(null);
  const searchInputRef = useRef(null);

  draftInputRef.current = input;

  const loadConversations = useCallback(async () => {
    if (!user?.dbId) return;
    try {
      setConvosLoading(true);
      const res = await axios.get("/messages/conversations");
      setConversations(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error("Failed to load conversations:", e);
    } finally {
      setConvosLoading(false);
    }
  }, [user?.dbId]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (!user?.dbId) return;
    try {
      const raw = sessionStorage.getItem("gtn_pending_voice_room_invite_out");
      if (!raw) return;
      sessionStorage.removeItem("gtn_pending_voice_room_invite_out");
      const p = JSON.parse(raw);
      if (p?.roomId) {
        setPendingRoomInvite({
          roomId: String(p.roomId),
          roomName: String(p.roomName || "Room").slice(0, 80),
        });
      }
    } catch {
      /* ignore */
    }
  }, [user?.dbId]);

  useEffect(() => {
    const onOpenPeer = (e) => {
      const d = e.detail || {};
      if (d.peerId != null && d.peerId !== "") {
        setPeerId(String(d.peerId));
        setPeerName(d.name || "Member");
        setWaView("chat");
        setSearchResults([]);
        setSearchQuery("");
      }
    };
    window.addEventListener("gtn-messages-open-peer", onOpenPeer);
    return () => window.removeEventListener("gtn-messages-open-peer", onOpenPeer);
  }, []);

  const markRead = useCallback(async () => {
    if (!user?.dbId || !peerId || !chatReadReceiptsOn) return;
    try {
      await axios.post("/messages/read", { peerId: Number(peerId) });
    } catch {
      /* ignore */
    }
  }, [user?.dbId, peerId, chatReadReceiptsOn]);

  const fetchHistory = useCallback(async () => {
    if (!user?.dbId || !peerId) return;
    try {
      setLoading(true);
      const res = await axios.get(`/messages/history?peerId=${peerId}`);
      setMessages(res.data || []);
      await markRead();
      await loadConversations();
    } catch (err) {
      console.error("Failed to load messages:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.dbId, peerId, markRead, loadConversations]);

  useEffect(() => {
    if (!user?.dbId || !peerId) return;
    fetchHistory();
  }, [user?.dbId, peerId, fetchHistory]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, peerTyping]);

  /** Show composer + SmartKeyboard whenever a thread is open (not only after input focus). */
  useEffect(() => {
    if (waView === "chat" && peerId) {
      setShowKeyboard(true);
    }
  }, [waView, peerId]);

  /** Socket.IO: realtime messages, ticks, typing (shared connection from ChatSocketProvider) */
  useEffect(() => {
    if (!socket || !user?.dbId) return;

    const onMessageNew = (msg) => {
      if (!msg || msg.roomId) return;
      if (msg.fromUserId === user.dbId) return;

      const from = String(msg.fromUserId);
      const to = msg.toUserId != null ? String(msg.toUserId) : "";
      const forMe = to === String(user.dbId);
      if (!forMe) return;

      const partnerOpen = String(peerId);
      const inThisChat = partnerOpen && from === partnerOpen;
      if (!inThisChat) {
        loadConversations();
        return;
      }

      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, { ...msg, deliveryStatus: msg.deliveryStatus || "sent" }];
      });

      socket.emit("message:delivered", { messageId: msg.id });
    };

    const onMessageStatus = ({ messageId, deliveryStatus }) => {
      if (!messageId) return;
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, deliveryStatus: deliveryStatus || m.deliveryStatus } : m))
      );
    };

    const onConversationRead = ({ peerId: readerId }) => {
      if (!readerId || String(readerId) !== peerId) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.fromUserId === user.dbId && m.toUserId === readerId ? { ...m, deliveryStatus: "read" } : m
        )
      );
    };

    const onTyping = ({ peerId: from, typing }) => {
      if (!chatTypingOn || !peerId || String(from) !== peerId) return;
      setPeerTyping(Boolean(typing));
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (typing) {
        typingTimeoutRef.current = setTimeout(() => setPeerTyping(false), 3000);
      }
    };

    socket.on("message:new", onMessageNew);
    socket.on("message:status", onMessageStatus);
    socket.on("conversation:read", onConversationRead);
    socket.on("typing", onTyping);

    return () => {
      socket.off("message:new", onMessageNew);
      socket.off("message:status", onMessageStatus);
      socket.off("conversation:read", onConversationRead);
      socket.off("typing", onTyping);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [socket, user?.dbId, peerId, loadConversations, chatTypingOn]);

  const emitTyping = useCallback(
    (typing) => {
      if (!chatTypingOn) return;
      const s = socketRef?.current;
      if (!s?.connected || !peerId) return;
      s.emit("typing", { peerId: Number(peerId), typing });
    },
    [peerId, socketRef, chatTypingOn]
  );

  const onInputChange = (value) => {
    const v = value.slice(0, 120);
    draftInputRef.current = v;
    setInput(v);
    if (!peerId) return;
    if (typingEmitRef.current) clearTimeout(typingEmitRef.current);
    emitTyping(true);
    typingEmitRef.current = setTimeout(() => {
      emitTyping(false);
      typingEmitRef.current = null;
    }, 1200);
  };

  const runContactSearch = async () => {
    if (!user?.dbId) return;
    const q = searchQuery.trim();
    if (q.length < 4) {
      console.warn("[GTN messages]", "Enter at least 4 characters.");
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const res = await axios.get(`/users/contacts/search?q=${encodeURIComponent(q)}`);
      setSearchResults(Array.isArray(res.data) ? res.data : []);
      if (!res.data?.length) {
        console.warn("[GTN messages]", "No contact matched.");
      }
    } catch (err) {
      console.error(err);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const openConversation = useCallback((conv) => {
    setPeerId(String(conv.peerId));
    setPeerName(conv.name);
    setSearchResults([]);
    setWaView("chat");
  }, []);

  const selectContact = (c) => {
    setPeerId(String(c.id));
    setPeerName(c.name || "Member");
    setSearchResults([]);
    setSearchQuery("");
    setWaView("chat");
  };

  const backToChats = useCallback(() => {
    setWaView("list");
    setPeerId("");
    setPeerName("");
    setMessages([]);
    setPeerTyping(false);
    setInput("");
    draftInputRef.current = "";
    setShowKeyboard(false);
    loadConversations();
  }, [loadConversations]);

  const sendMessage = useCallback(async () => {
    const trimmed = draftInputRef.current.trim();
    if (!trimmed) return;
    if (!user?.dbId) {
      return;
    }
    if (!peerId) {
      console.warn("[GTN messages]", "Search and pick a contact first.");
      return;
    }

    const optimistic = {
      id: `local-${Date.now()}`,
      fromUserId: user.dbId,
      toUserId: Number(peerId),
      content: trimmed,
      type: "text",
      createdAt: new Date().toISOString(),
      deliveryStatus: "sent",
    };

    setMessages((prev) => [...prev, optimistic]);
    draftInputRef.current = "";
    setInput("");
    setShowKeyboard(false);
    emitTyping(false);

    try {
      const res = await axios.post("/messages/send", {
        receiverId: Number(peerId),
        type: "text",
        content: trimmed,
      });
      const saved = res.data;
      setMessages((prev) =>
        prev.map((m) => (m.id === optimistic.id ? { ...saved, deliveryStatus: saved.deliveryStatus || "sent" } : m))
      );
      await loadConversations();
    } catch (err) {
      console.error("Failed to send message:", err);
      const apiMsg =
        err?.data && typeof err.data === "object"
          ? err.data.message || err.data.error
          : null;
      alert(apiMsg || err?.message || "Message failed to send.");
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    }
  }, [user?.dbId, peerId, emitTyping, loadConversations]);

  const sendPendingRoomInvite = useCallback(async () => {
    if (!user?.dbId || !peerId || !pendingRoomInvite) return;
    try {
      await axios.post("/messages/send", {
        receiverId: Number(peerId),
        type: "voice_room_invite",
        content: JSON.stringify({
          roomId: pendingRoomInvite.roomId,
          name: pendingRoomInvite.roomName,
        }),
      });
      setPendingRoomInvite(null);
      await fetchHistory();
      await loadConversations();
    } catch (err) {
      const apiMsg =
        err?.data && typeof err.data === "object" ? err.data.message || err.data.error : null;
      alert(apiMsg || err?.message || "Could not send invite.");
    }
  }, [user?.dbId, peerId, pendingRoomInvite, fetchHistory, loadConversations]);

  const openInviteFromMessage = useCallback(
    (roomId, roomName) => {
      try {
        sessionStorage.setItem(
          "gtn_pending_voice_room_join",
          JSON.stringify({ roomId, roomName: roomName || "Room" })
        );
      } catch {
        /* ignore */
      }
      router.push("/dashboard?tab=rooms");
    },
    [router]
  );

  const stopRecording = () => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") {
      mr.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setRecording(false);
  };

  const startRecording = async () => {
    if (!user?.dbId || !peerId || voiceBusy) return;
    try {
      const stream = await acquireMicStream(getVoiceMediaPrefs(user));
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";
      const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      mediaChunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size) mediaChunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        const blob = new Blob(mediaChunksRef.current, { type: mr.mimeType || "audio/webm" });
        mediaChunksRef.current = [];
        if (blob.size < 200) {
          setVoiceBusy(false);
          return;
        }
        try {
          setVoiceBusy(true);
          const reader = new FileReader();
          const base64 = await new Promise((resolve, reject) => {
            reader.onerror = reject;
            reader.onload = () => {
              const dataUrl = reader.result;
              const b64 = typeof dataUrl === "string" ? dataUrl.split(",")[1] : "";
              resolve(b64);
            };
            reader.readAsDataURL(blob);
          });
          const res = await axios.post("/messages/voice", {
            receiverId: Number(peerId),
            mimeType: mr.mimeType || "audio/webm",
            audioBase64: base64,
          });
          const saved = res.data;
          setMessages((prev) => [...prev, { ...saved, deliveryStatus: saved.deliveryStatus || "sent" }]);
          await loadConversations();
        } catch (e) {
          console.error(e);
          const apiMsg =
            e?.data && typeof e.data === "object" ? e.data.message || e.data.error : null;
          alert(apiMsg || e?.message || "Could not send voice note.");
        } finally {
          setVoiceBusy(false);
        }
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setRecording(true);
    } catch (e) {
      console.error(e);
      alert("Microphone permission is required for voice notes.");
    }
  };

  const scheduleTypingTimeout = useCallback(() => {
    if (typingEmitRef.current) clearTimeout(typingEmitRef.current);
    emitTyping(true);
    typingEmitRef.current = setTimeout(() => {
      emitTyping(false);
      typingEmitRef.current = null;
    }, 1200);
  }, [emitTyping]);

  const pressKey = useCallback(
    (key) => {
      if (key === "BACK") {
        setInput((prev) => {
          const next = prev.slice(0, -1);
          draftInputRef.current = next;
          return next;
        });
        return;
      }

      if (key === "SPACE") {
        setInput((prev) => {
          const next = (prev + " ").slice(0, 120);
          draftInputRef.current = next;
          if (peerId) scheduleTypingTimeout();
          return next;
        });
        return;
      }
      if (key === "SEND") {
        void sendMessage();
        return;
      }

      setInput((prev) => {
        const next = (prev + key).slice(0, 120);
        draftInputRef.current = next;
        if (peerId) scheduleTypingTimeout();
        return next;
      });
    },
    [peerId, sendMessage, scheduleTypingTimeout]
  );

  const toggleMode = (mode) => setKeyboardMode(mode);

  const showListPanel = waView === "list";
  const showThreadPanel = waView === "chat" && Boolean(peerId);

  const refCode = user?.referralCode ?? user?.subscriberId;

  return (
    <div
      className={`phone-screen phone-screen-dark msg-screen msg-wa-root ${showKeyboard ? "keyboard-open" : ""}`}
    >
      {!user?.dbId && <GuestAuthPrompt variant="compact" />}

      {user?.dbId && (
        <div className="msg-wa-layout">
          {pendingRoomInvite ? (
            <div className="msg-pending-voice-room-invite" role="status">
              {peerId ? (
                <>
                  Send invite to <strong>{peerName}</strong> for &ldquo;{pendingRoomInvite.roomName}&rdquo;?
                  <div className="msg-pending-voice-room-invite-actions">
                    <button type="button" onClick={() => void sendPendingRoomInvite()}>
                      Send invite
                    </button>
                    <button type="button" onClick={() => setPendingRoomInvite(null)}>
                      Dismiss
                    </button>
                  </div>
                </>
              ) : (
                <>
                  Open a chat below to send an invite for &ldquo;
                  <strong>{pendingRoomInvite.roomName}</strong>&rdquo;.
                  <div className="msg-pending-voice-room-invite-actions">
                    <button type="button" onClick={() => setPendingRoomInvite(null)}>
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : null}
          {showListPanel && (
            <aside className="msg-wa-sidebar">
              <div className="msg-wa-sidebar-head">
                <div className="msg-title">Chats</div>
                <div className="msg-wa-sidebar-head-right">
                  {user?.dbId && onOpenContactsSettings ? (
                    <button
                      type="button"
                      className="msg-contacts-settings-btn"
                      onClick={onOpenContactsSettings}
                      aria-label="Contacts in Settings"
                      title="Contacts"
                    >
                      <IoPeopleOutline size={20} aria-hidden />
                    </button>
                  ) : null}
                  {user?.dbId ? (
                    <ReferralInviteShare
                      refCode={refCode}
                      source="messages"
                      meta="header"
                      layout="compact"
                      className="msg-invite-to-chat-wrap"
                    />
                  ) : null}
                </div>
              </div>
              <div className="msg-contact-panel msg-contact-panel--inbox">
                <div className="msg-contact-search-row">
                  <button
                    type="button"
                    className="msg-contact-add-btn"
                    onClick={() => searchInputRef.current?.focus()}
                    aria-label="New chat — phone number"
                  >
                    +
                  </button>
                  <input
                    ref={searchInputRef}
                    type="text"
                    className="msg-composer-input"
                    placeholder="Phone number (+256…)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        runContactSearch();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="msg-search-btn"
                    onClick={runContactSearch}
                    disabled={searchLoading}
                  >
                    {searchLoading ? "…" : "Search"}
                  </button>
                </div>
                {searchResults.length > 0 && (
                  <ul className="msg-contact-results">
                    {searchResults.map((c) => (
                      <li key={c.id}>
                        <button type="button" className="msg-contact-pick" onClick={() => selectContact(c)}>
                          <span className="msg-contact-name">{c.name}</span>
                          <span className="msg-contact-meta">{c.phone || "—"}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <ul className="msg-convo-list" aria-label="Conversations">
                  {convosLoading && conversations.length === 0 && (
                    <li className="msg-convo-loading" aria-busy="true">
                      …
                    </li>
                  )}
                  {conversations.map((c) => (
                    <li key={c.peerId}>
                      <button
                        type="button"
                        className={`msg-convo-item ${String(peerId) === String(c.peerId) ? "msg-convo-item--active" : ""}`}
                        onClick={() => openConversation(c)}
                      >
                        <div className="msg-convo-item-top">
                          <span className="msg-convo-name">{c.name}</span>
                          <span className="msg-convo-time">{formatShortTime(c.lastMessageAt)}</span>
                        </div>
                        <div className="msg-convo-item-bottom">
                          <span className="msg-convo-preview">{c.lastPreview}</span>
                          {c.unread > 0 ? (
                            <span className="msg-convo-badge">{c.unread > 99 ? "99+" : c.unread}</span>
                          ) : null}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
                {!convosLoading && conversations.length === 0 && user?.dbId && (
                  <div className="msg-convo-empty-recruit">
                    <p className="msg-convo-empty-recruit-title">No contacts yet?</p>
                    <ReferralInviteShare
                      refCode={refCode}
                      source="messages"
                      meta="inbox_empty"
                      layout="buttons"
                      className="referral-entry-cta--messages-wrap"
                    />
                    <p className="msg-convo-empty-recruit-hint">Share your link so friends can sign up and chat with you.</p>
                  </div>
                )}
              </div>
            </aside>
          )}

          {showThreadPanel && (
            <section className="msg-wa-thread">
              <div className="msg-wa-thread-bar">
                <button type="button" className="msg-wa-back" onClick={backToChats} aria-label="Back to chats">
                  <IoChevronBackOutline size={22} />
                </button>
                <span className="msg-wa-thread-title">{peerName}</span>
              </div>

              <div ref={listRef} className="msg-list">
                    {loading && <div className="msg-loading" aria-busy="true" />}

                    {chatTypingOn && peerTyping && peerId && (
                      <div className="msg-typing-row" aria-live="polite">
                        <span className="msg-typing-dots">
                          <span />
                          <span />
                          <span />
                        </span>
                        <span className="msg-typing-label">{peerName || "Contact"} is typing…</span>
                      </div>
                    )}

                    {messages.map((m) => {
                      const mine = m.fromUserId === user?.dbId;
                      const isVoice = m.type === "voice";
                      const isRoomInvite = m.type === "voice_room_invite";
                      const inviteParsed = isRoomInvite ? parseVoiceRoomInviteDm(m.content) : null;
                      return (
                        <div
                          key={m.id}
                          className={mine ? "msg-bubble-row mine" : "msg-bubble-row"}
                        >
                          <div className={mine ? "msg-bubble mine" : "msg-bubble"}>
                            {isVoice ? (
                              <div className="msg-voice-wrap">
                                <MessageVoiceWaveform messageId={m.id} />
                              </div>
                            ) : isRoomInvite ? (
                              inviteParsed ? (
                                <div className="msg-voice-room-invite-card">
                                  <div className="msg-voice-room-invite-title">
                                    Voice room: {inviteParsed.name}
                                  </div>
                                  {!mine ? (
                                    <button
                                      type="button"
                                      className="msg-voice-room-invite-btn"
                                      onClick={() =>
                                        openInviteFromMessage(inviteParsed.roomId, inviteParsed.name)
                                      }
                                    >
                                      Join room
                                    </button>
                                  ) : (
                                    <span className="text-slate-500 text-xs">Invite sent</span>
                                  )}
                                </div>
                              ) : (
                                <div className="msg-text">Voice room invite</div>
                              )
                            ) : (
                              <div className="msg-text">{m.content}</div>
                            )}
                            {mine && chatReadReceiptsOn && (
                              <div className="msg-meta-row">
                                <MessageTicks status={m.deliveryStatus} />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {!loading && messages.length === 0 && user?.dbId && peerId && (
                      <div className="msg-empty" aria-hidden />
                    )}
                  </div>

                  <div className="msg-composer-row msg-composer-with-voice">
                    <button
                      type="button"
                      className={`msg-mic-btn ${recording ? "recording" : ""}`}
                      disabled={!user?.dbId || !peerId || voiceBusy}
                      onClick={() => {
                        if (recording) stopRecording();
                        else startRecording();
                      }}
                      title={recording ? "Stop & send" : "Record voice note"}
                      aria-label={recording ? "Stop recording" : "Record voice note"}
                    >
                      {voiceBusy ? "…" : recording ? "■" : "🎤"}
                    </button>
                    <div className="msg-composer-text-wrap">
                      <input
                        type="text"
                        className="msg-composer-input msg-composer-input--inline"
                        value={input}
                        placeholder="Type message"
                        onFocus={() => {
                          setKeyboardMode("lower");
                          setShowKeyboard(true);
                        }}
                        onChange={(e) => onInputChange(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            sendMessage();
                          }
                          if (e.key === "Escape") {
                            setShowKeyboard(false);
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="msg-send-inline-btn"
                        onClick={() => void sendMessage()}
                        disabled={!user?.dbId || !peerId}
                        aria-label="Send message"
                        title="Send"
                      >
                        <IoSend size={18} aria-hidden />
                      </button>
                    </div>
                  </div>

                  {showKeyboard && peerId && (
                    <SmartKeyboard
                      keyboardMode={keyboardMode}
                      onChangeMode={toggleMode}
                      onKeyPress={pressKey}
                      showModeTabs
                      allowedModes={["lower", "upper", "symbols", "numbers"]}
                      showSpaceButton
                      showSendButton
                    />
                  )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
