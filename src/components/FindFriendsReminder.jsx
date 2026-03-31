"use client";

import { useState } from "react";
import Link from "next/link";
import { IoSearchOutline, IoCloseOutline } from "react-icons/io5";
import ReferralInviteShare from "@/components/ReferralInviteShare";
import {
  getSkippedFindFriends,
  isFindFriendsReminderSnoozed,
  snoozeFindFriendsReminder,
} from "@/lib/findFriendsOnboarding";

/**
 * Soft, dismissible banner when user skipped Find Friends but has no chats yet.
 */
export default function FindFriendsReminder({ user }) {
  const [dismissedSession, setDismissedSession] = useState(false);

  const eligible =
    !dismissedSession &&
    user?.dbId &&
    user?.hasChats === false &&
    getSkippedFindFriends() &&
    !isFindFriendsReminderSnoozed();

  if (!eligible) return null;

  const refCode = user?.referralCode ?? user?.subscriberId;

  return (
    <div className="gtn-find-friends-banner" role="status">
      <div className="gtn-find-friends-banner-inner gtn-find-friends-banner-inner--icon-only">
        <div className="gtn-find-friends-banner-actions">
          <ReferralInviteShare
            refCode={refCode}
            source="empty_state_banner"
            meta="no_chats"
            layout="icons"
          />
          <Link href="/find-friends" className="gtn-find-friends-banner-link" aria-label="Find friends">
            <IoSearchOutline size={22} aria-hidden />
          </Link>
          <button
            type="button"
            className="gtn-find-friends-banner-dismiss"
            onClick={() => {
              snoozeFindFriendsReminder(7);
              setDismissedSession(true);
            }}
            aria-label="Dismiss reminder for 7 days"
          >
            <IoCloseOutline size={22} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
