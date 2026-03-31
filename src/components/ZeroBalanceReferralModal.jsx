"use client";

import Link from "next/link";
import ReferralInviteShare from "@/components/ReferralInviteShare";

/**
 * Conversion moment: minutes are exhausted — invite or upgrade plan.
 */
export default function ZeroBalanceReferralModal({ open, onClose, user }) {
  if (!open) return null;
  const ref = user?.referralCode ?? user?.subscriberId;

  return (
    <div
      className="gtn-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gtn-zero-bal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="gtn-modal-card">
        <h2 id="gtn-zero-bal-title" className="gtn-modal-title">
          Need more minutes
        </h2>
        <p className="gtn-modal-copy">
          You’ve used your free minutes. Upgrade your plan or invite a friend to earn free minutes on GTN.
        </p>
        <div className="gtn-modal-actions">
          <Link href="/dashboard?tab=plans" className="gtn-modal-btn gtn-modal-btn--primary" onClick={onClose}>
            Upgrade plan
          </Link>
          {ref != null && String(ref).trim() !== "" ? (
            <ReferralInviteShare
              refCode={ref}
              source="zero_balance_call"
              meta="dial_pad"
              layout="stack"
              className="gtn-modal-invite-share"
            />
          ) : (
            <Link href="/login?mode=signup" className="gtn-modal-btn gtn-modal-btn--secondary" onClick={onClose}>
              Create account to invite
            </Link>
          )}
        </div>
        <button type="button" className="gtn-modal-dismiss" onClick={onClose}>
          Not now
        </button>
      </div>
    </div>
  );
}
