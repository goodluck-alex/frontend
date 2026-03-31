"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { IoChevronBackOutline } from "react-icons/io5";

export default function PayShell({ title = "Pay", children }) {
  const router = useRouter();
  const canGoBack = useMemo(() => typeof window !== "undefined" && window.history.length > 1, []);

  return (
    <div className="mobile-shell-root pay-shell">
      <div className="mobile-shell-frame">
        <div className="mobile-appbar">
          <button
            type="button"
            className="mobile-appbar-back"
            onClick={() => (canGoBack ? router.back() : router.push("/dashboard?tab=plans"))}
            aria-label="Back"
          >
            <IoChevronBackOutline size={20} />
          </button>
          <div className="mobile-appbar-brand">
            <span className="mobile-appbar-phoneid">{title}</span>
          </div>
          <div className="mobile-appbar-right" />
        </div>

        <div className="mobile-shell-body">{children}</div>
      </div>
    </div>
  );
}

