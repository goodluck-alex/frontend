"use client";

import Link from "next/link";

/**
 * Shown when the user is not signed in (guest). Links to combined login/signup page.
 */
export default function GuestAuthPrompt({ variant = "banner", className = "" }) {
  return (
    <div className={`guest-auth-prompt guest-auth-prompt--${variant} ${className}`.trim()}>
      <p className="guest-auth-prompt__text">
        <Link href="/login" className="guest-auth-prompt__link">
          Sign in
        </Link>
        <span className="guest-auth-prompt__sep"> · </span>
        <Link href="/login?mode=signup" className="guest-auth-prompt__link">
          Create account
        </Link>
      </p>
    </div>
  );
}
