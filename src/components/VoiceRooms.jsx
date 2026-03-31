"use client";

import { useEffect, useState } from "react";
import { IoAddOutline, IoPeopleOutline } from "react-icons/io5";
import axios from "@/services/api";
import GuestAuthPrompt from "@/components/GuestAuthPrompt";
import VoiceRoomSession from "@/components/VoiceRoomSession";
import ReferralInviteShare from "@/components/ReferralInviteShare";

/**
 * Voice rooms list comes from REST `/api/voice-rooms` (DB-backed).
 */
export default function VoiceRooms({ user, onOpenContactsSettings, onNavigateTab }) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  /** { id, name } when user is in a live voice session */
  const [liveRoom, setLiveRoom] = useState(null);

  const loadRooms = async () => {
    if (!user?.dbId) return;
    setLoading(true);
    setError("");
    try {
      const res = await axios.get("/voice-rooms");
      setRooms(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
      setError(e.message || "load_failed");
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.dbId]);

  useEffect(() => {
    if (!user?.dbId) return;
    try {
      const raw = sessionStorage.getItem("gtn_pending_voice_room_join");
      if (!raw) return;
      sessionStorage.removeItem("gtn_pending_voice_room_join");
      const p = JSON.parse(raw);
      if (p?.roomId) {
        setLiveRoom({ id: String(p.roomId), name: String(p.roomName || "Room").slice(0, 80) });
      }
    } catch {
      /* ignore */
    }
  }, [user?.dbId]);

  const createRoom = async () => {
    const name = newName.trim();
    if (!name || !user?.dbId) return;
    setCreating(true);
    setError("");
    try {
      await axios.post("/voice-rooms", { name });
      setNewName("");
      await loadRooms();
    } catch (e) {
      console.error(e);
      setError(e.message || "create_failed");
    } finally {
      setCreating(false);
    }
  };

  if (!user?.dbId) {
    return (
      <div className="phone-panel phone-panel-scroll voice-rooms-guest">
        <h2 className="sr-only">Voice rooms</h2>
        <GuestAuthPrompt />
      </div>
    );
  }

  const refCode = user?.referralCode ?? user?.subscriberId;
  const roomInviteMeta = liveRoom?.name ? String(liveRoom.name).slice(0, 80) : "session";

  if (liveRoom?.id) {
    return (
      <div className="phone-panel phone-panel-scroll voice-rooms-live">
        <h2 className="sr-only">Voice room {liveRoom.name}</h2>
        <VoiceRoomSession
          roomId={liveRoom.id}
          userDbId={user.dbId}
          user={user}
          inviteRefCode={refCode}
          inviteSource="voice_room"
          inviteMeta={roomInviteMeta}
          onLeave={() => setLiveRoom(null)}
          onNavigateToMessages={() => onNavigateTab?.("messages")}
        />
      </div>
    );
  }

  return (
    <div className="phone-panel phone-panel-scroll">
      <h2 className="sr-only">Voice rooms</h2>

      {onOpenContactsSettings ? (
        <button
          type="button"
          className="voice-rooms-contacts-link"
          onClick={onOpenContactsSettings}
        >
          <IoPeopleOutline size={18} aria-hidden />
          <span>Contacts &amp; invites</span>
        </button>
      ) : null}

      {refCode != null && refCode !== "" ? (
        <div className="referral-entry-cta--voice-wrap mb-3">
          <p className="voice-rooms-invite-label">Invite friends to join a room</p>
          <ReferralInviteShare refCode={refCode} source="voice_rooms" meta="rooms_list" layout="bar" />
        </div>
      ) : null}

      <div className="flex flex-col gap-2 mb-4">
        <input
          type="text"
          className="msg-composer-input"
          value={newName}
          onChange={(e) => setNewName(e.target.value.slice(0, 80))}
          aria-label="Room name"
        />
        <button
          type="button"
          className="btn-primary text-sm px-3 py-2 rounded-lg font-semibold disabled:opacity-50"
          disabled={creating || !newName.trim()}
          onClick={createRoom}
          aria-label={creating ? "Creating" : "Create room"}
        >
          {creating ? (
            <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden />
          ) : (
            <IoAddOutline size={22} aria-hidden />
          )}
        </button>
      </div>

      {error && (
        <div className="voice-rooms-error" role="alert">
          {error}
        </div>
      )}
      {loading && (
        <div
          className="w-5 h-5 border-2 border-slate-500 border-t-sky-400 rounded-full animate-spin mb-3"
          aria-busy="true"
          aria-label="Loading"
        />
      )}

      {!loading && rooms.length === 0 && !error && <div className="h-2 mb-2" aria-hidden />}

      <ul className="space-y-2">
        {rooms.map((room) => (
          <li
            key={room.id}
            className="flex justify-between items-center gap-2 bg-gray-900/40 p-2 rounded border border-slate-700/60"
          >
            <span className="text-slate-200 min-w-0 truncate">{room.name}</span>
            <button
              type="button"
              className="voice-room-join-btn"
              onClick={() => setLiveRoom({ id: room.id, name: room.name })}
            >
              Join
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
