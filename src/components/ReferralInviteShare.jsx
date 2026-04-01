"use client";

import { useCallback, useMemo, useState } from "react";
import { IoCopyOutline, IoShareOutline } from "react-icons/io5";
import {
  buildSignupInviteAbsoluteUrl,
  buildSignupInviteHref,
  logReferralClickHttp,
} from "@/lib/referralAttribution";

/**
 * Logged-in user: share or copy referral link (does not navigate to /login).
 *
 * @param {string|number} refCode — subscriberId / referralCode
 * @param {string} [source] — analytics src query + click log
 * @param {string} [meta] — analytics meta query + click log
 * @param {'buttons'|'compact'|'bar'|'icons'|'stack'|'rowIcons'|'inviteIcon'} [layout]
 */
export default function ReferralInviteShare({
  refCode,
  source = "invite",
  meta = "",
  layout = "buttons",
  className = "",
}) {
  const [copied, setCopied] = useState(false);

  const url = useMemo(() => {
    if (refCode == null || String(refCode).trim() === "") return "";
    return buildSignupInviteAbsoluteUrl(refCode, { source, meta });
  }, [refCode, source, meta]);

  const pathForLog = useMemo(() => {
    if (refCode == null || String(refCode).trim() === "") return "";
    return buildSignupInviteHref(refCode, { source, meta });
  }, [refCode, source, meta]);

  const logClick = useCallback(
    (kind) => {
      if (refCode == null || String(refCode).trim() === "") return;
      const suffix = meta ? `${meta}:${kind}` : kind;
      void logReferralClickHttp(refCode, source, suffix);
    },
    [refCode, source, meta]
  );

  const copyLink = useCallback(async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      logClick("copy");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [url, logClick]);

  const shareLink = useCallback(async () => {
    if (!url) return;
    logClick("share");
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Join me on GTN",
          text: "I'd love for you to join me on GTN so we can chat, call, and stay connected.",
          url,
        });
        return;
      } catch (e) {
        if (e?.name === "AbortError") return;
      }
    }
    await copyLink();
  }, [url, logClick, copyLink]);

  if (!refCode || String(refCode).trim() === "" || !pathForLog) return null;

  const shareLabel = "Share link";
  const copyLabel = copied ? "Copied!" : "Copy link";

  if (layout === "compact") {
    return (
      <div className={`referral-invite-share referral-invite-share--compact ${className}`.trim()}>
        <button type="button" className="referral-invite-share__btn referral-invite-share__btn--compact" onClick={() => void shareLink()}>
          {shareLabel}
        </button>
        <span className="referral-invite-share__sep" aria-hidden>
          ·
        </span>
        <button type="button" className="referral-invite-share__btn referral-invite-share__btn--compact" onClick={() => void copyLink()}>
          {copyLabel}
        </button>
      </div>
    );
  }

  if (layout === "rowIcons") {
    return (
      <div className={`referral-invite-share referral-invite-share--row-icons ${className}`.trim()}>
        <button
          type="button"
          className="referral-copy-btn"
          disabled={!url}
          aria-label="Share referral link"
          title="Share link"
          onClick={() => void shareLink()}
        >
          <IoShareOutline size={20} aria-hidden />
        </button>
        <button
          type="button"
          className="referral-copy-btn"
          disabled={!url}
          aria-label="Copy referral link"
          title={copyLabel}
          onClick={() => void copyLink()}
        >
          <IoCopyOutline size={20} aria-hidden />
        </button>
      </div>
    );
  }

  /** Single share / invite icon (contacts list, no labels) */
  if (layout === "inviteIcon") {
    return (
      <button
        type="button"
        className={`referral-invite-share referral-invite-share--invite-icon ${className}`.trim()}
        disabled={!url}
        aria-label="Invite"
        title="Invite"
        onClick={() => void shareLink()}
      >
        <IoShareOutline size={20} aria-hidden />
      </button>
    );
  }

  if (layout === "icons") {
    return (
      <div className={`referral-invite-share referral-invite-share--icons ${className}`.trim()}>
        <button
          type="button"
          className="gtn-find-friends-banner-link"
          aria-label="Share invite link"
          title="Share link"
          onClick={() => void shareLink()}
        >
          <IoShareOutline size={22} aria-hidden />
        </button>
        <button
          type="button"
          className="gtn-find-friends-banner-link"
          aria-label="Copy invite link"
          title="Copy link"
          onClick={() => void copyLink()}
        >
          <IoCopyOutline size={22} aria-hidden />
        </button>
      </div>
    );
  }

  if (layout === "bar") {
    return (
      <div className={`referral-invite-share referral-invite-share--bar ${className}`.trim()}>
        <button type="button" className="referral-invite-share__btn referral-invite-share__btn--bar" onClick={() => void shareLink()}>
          <IoShareOutline size={18} aria-hidden className="referral-invite-share__icon" />
          {shareLabel}
        </button>
        <button type="button" className="referral-invite-share__btn referral-invite-share__btn--bar" onClick={() => void copyLink()}>
          <IoCopyOutline size={18} aria-hidden className="referral-invite-share__icon" />
          {copyLabel}
        </button>
      </div>
    );
  }

  if (layout === "stack") {
    return (
      <div className={`referral-invite-share referral-invite-share--stack ${className}`.trim()}>
        <button type="button" className="gtn-modal-btn gtn-modal-btn--secondary" onClick={() => void shareLink()}>
          {shareLabel}
        </button>
        <button type="button" className="gtn-modal-btn gtn-modal-btn--secondary" onClick={() => void copyLink()}>
          {copyLabel}
        </button>
      </div>
    );
  }

  /* buttons — default: full-width column (messages empty, etc.) */
  return (
    <div className={`referral-invite-share referral-invite-share--buttons ${className}`.trim()}>
      <button type="button" className="referral-entry-cta referral-invite-share__primary" onClick={() => void shareLink()}>
        <IoShareOutline size={18} aria-hidden className="referral-invite-share__icon" />
        {shareLabel}
      </button>
      <button type="button" className="referral-entry-cta referral-entry-cta--secondary" onClick={() => void copyLink()}>
        <IoCopyOutline size={18} aria-hidden className="referral-invite-share__icon" />
        {copyLabel}
      </button>
    </div>
  );
}
