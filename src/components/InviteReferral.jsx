"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "@/services/api";
import GuestAuthPrompt from "@/components/GuestAuthPrompt";
import ReferralInviteShare from "@/components/ReferralInviteShare";
import { buildSignupInviteHref } from "@/lib/referralAttribution";

export default function InviteReferral({ user }) {
  const [referrals, setReferrals] = useState([]);
  const [inviteLink, setInviteLink] = useState("");

  const fetchReferrals = useCallback(async () => {
    if (!user?.dbId) return;
    try {
      const res = await axios.get(`/referrals`);
      setReferrals(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to fetch referrals:", err);
      setReferrals([]);
    }
  }, [user?.dbId]);

  useEffect(() => {
    if (!user?.dbId) return;
    const code = user.referralCode ?? user.subscriberId;
    if (typeof window !== "undefined" && code != null && code !== "") {
      const path = buildSignupInviteHref(code, { source: "referrals_tab", meta: "share_link" });
      setInviteLink(`${window.location.origin}${path}`);
    }
    void fetchReferrals();
  }, [user, fetchReferrals]);

  if (!user?.dbId) {
    return (
      <div className="phone-panel phone-panel-scroll referral-screen">
        <h2 className="sr-only">Referrals</h2>
        <GuestAuthPrompt />
      </div>
    );
  }

  return (
    <div className="phone-panel phone-panel-scroll referral-screen">
      <h2 className="sr-only">Referrals</h2>
      <div className="referral-link-row">
        <input
          type="text"
          value={inviteLink}
          readOnly
          className="referral-link"
          placeholder=""
          aria-label="Referral link"
        />
        <ReferralInviteShare
          refCode={user.referralCode ?? user.subscriberId}
          source="referrals_tab"
          meta="share_link"
          layout="rowIcons"
        />
      </div>
      <p className="referral-hint">Share or copy your link — friends open it to sign up (you stay signed in).</p>
      <h3 className="sr-only">Referral list</h3>
      <ul className="referral-list">
        {referrals.map((r) => (
          <li key={r.id} className="referral-item">
            <span className="referral-item-name">{r.referredName || "Friend"}</span>
            <span className="referral-item-meta">
              <span className="referral-item-status" data-status={r.status || ""}>
                {r.status === "completed"
                  ? `+${r.bonusMinutes ?? 10} min`
                  : r.status === "verified"
                    ? "Active — reward after their first call, message, or top-up"
                    : r.status || "Pending"}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
