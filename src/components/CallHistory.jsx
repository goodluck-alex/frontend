"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IoCallOutline } from "react-icons/io5";
import { fetchCalls } from "@/services/api";
import GuestAuthPrompt from "@/components/GuestAuthPrompt";
import ZeroBalanceReferralModal from "@/components/ZeroBalanceReferralModal";
import { useDialCall } from "@/hooks/useDialCall";

export default function CallHistory({ user }) {
  const userPhone = user?.id;
  const { callNumber, voiceBusy } = useDialCall(user);
  const [calls, setCalls] = useState([]);
  const [zeroBalanceModal, setZeroBalanceModal] = useState(false);

  useEffect(() => {
    if (!userPhone) return;
    const loadCalls = async () => {
      try {
        const response = await fetchCalls();
        setCalls(response.data || []);
      } catch (err) {
        console.error(err);
      }
    };
    loadCalls();
  }, [userPhone]);

  const formatTime = (ts) => {
    if (!ts) return "";
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  const missedCalls = [];
  const outgoingCalls = [];
  const incomingCalls = [];

  const currentPhone = userPhone;
  for (const c of calls) {
    const outgoing = c?.callerPhone === currentPhone;
    const incoming = c?.receiverPhone === currentPhone;
    const status = c?.status || "ended";

    if (status === "missed" && incoming) missedCalls.push(c);
    else if (outgoing) outgoingCalls.push(c);
    else if (incoming) incomingCalls.push(c);
  }

  const canTapCall = Boolean(userPhone && !voiceBusy);

  const renderCallItem = (c, kind) => {
    const outgoing = c?.callerPhone === currentPhone;
    const otherPhone = outgoing ? c?.receiverPhone : c?.callerPhone;
    const durationMin = c?.duration ?? 0;
    const status = c?.status || "ended";

    const statusClass =
      kind === "missed"
        ? "callstatus-missed"
        : kind === "outgoing"
          ? "callstatus-outgoing"
          : kind === "incoming"
            ? "callstatus-incoming"
            : status === "started"
              ? "callstatus-active"
              : outgoing
                ? "callstatus-outgoing"
                : "callstatus-incoming";

    const label =
      kind === "missed" ? "Missed Call" : kind === "outgoing" ? "Outgoing Call" : "Incoming Call";

    const direction = kind === "outgoing" ? "To" : "From";

    return (
      <li key={c.id} className="callhistory-item">
        <button
          type="button"
          className="callhistory-call-btn"
          disabled={!canTapCall || !otherPhone}
          onClick={() =>
            void (async () => {
              const r = await callNumber(otherPhone);
              if (!r?.ok && r?.reason === "plans") setZeroBalanceModal(true);
            })()
          }
          aria-label={`Call ${otherPhone}`}
          title="Call"
        >
          <IoCallOutline size={20} aria-hidden />
        </button>
        <span className={`callstatus-dot ${statusClass}`} />
        <div className="callhistory-item-main">
          <div className="callhistory-item-top">
            <span className="callhistory-item-label">{label}</span>
            <span className="callhistory-item-time">{formatTime(c.createdAt)}</span>
          </div>
          <div className="callhistory-item-bottom">
            <span className="callhistory-item-other">
              {direction} {otherPhone}
            </span>
            <span className="callhistory-item-duration">{durationMin > 0 ? `${durationMin} min` : ""}</span>
          </div>
        </div>
      </li>
    );
  };

  if (!userPhone) {
    return (
      <div className="phone-panel phone-panel-scroll callhistory-screen">
        <div className="callhistory-header">
          <div>
            <div className="callhistory-title">Call History</div>
            <div className="callhistory-subtitle">Your GTN calls</div>
          </div>
        </div>
        <GuestAuthPrompt />
      </div>
    );
  }

  return (
    <div className="phone-panel phone-panel-scroll callhistory-screen">
      <ZeroBalanceReferralModal
        open={zeroBalanceModal}
        onClose={() => setZeroBalanceModal(false)}
        user={user}
      />
      <div className="callhistory-header">
        <div>
          <div className="callhistory-title">Call History</div>
          <div className="callhistory-subtitle">Recent GTN calls</div>
        </div>
        <div className="callhistory-stats">
          <span className="callhistory-pill missed">{missedCalls.length}</span>
          <span className="callhistory-pill outgoing">{outgoingCalls.length}</span>
          <span className="callhistory-pill incoming">{incomingCalls.length}</span>
        </div>
      </div>

      <div className="callhistory-list">
        {calls.length === 0 ? (
          <div className="callhistory-empty">No calls yet</div>
        ) : (
          <div className="callhistory-sections">
            <div className="callhistory-section">
              <div className="callhistory-section-title missed">Missed</div>
              {missedCalls.length === 0 ? (
                <div className="callhistory-section-empty">No missed calls</div>
              ) : (
                <ul className="callhistory-ul">{missedCalls.map((c) => renderCallItem(c, "missed"))}</ul>
              )}
            </div>

            <div className="callhistory-section">
              <div className="callhistory-section-title outgoing">Outgoing</div>
              {outgoingCalls.length === 0 ? (
                <div className="callhistory-section-empty">No outgoing calls</div>
              ) : (
                <ul className="callhistory-ul">
                  {outgoingCalls.map((c) => renderCallItem(c, "outgoing"))}
                </ul>
              )}
            </div>

            <div className="callhistory-section">
              <div className="callhistory-section-title incoming">Incoming</div>
              {incomingCalls.length === 0 ? (
                <div className="callhistory-section-empty">No incoming calls</div>
              ) : (
                <ul className="callhistory-ul">{incomingCalls.map((c) => renderCallItem(c, "incoming"))}</ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
