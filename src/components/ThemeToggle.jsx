"use client";

import { useEffect, useState } from "react";

/**
 * Same switch UI as GtnSettings (`gtn-settings-switch`), not a text pill.
 * Defers theme read until after mount so server HTML matches first client paint (avoids hydration mismatch).
 */
export default function ThemeToggle({ className = "", label = "Dark mode" }) {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = window.localStorage.getItem("gtn_theme");
      const dark = saved === "dark";
      setIsDark(dark);
      document.body.classList.toggle("dark", dark);
    } catch {
      /* ignore */
    }
  }, []);

  const onToggle = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    document.body.classList.toggle("dark", nextDark);
    try {
      window.localStorage.setItem("gtn_theme", nextDark ? "dark" : "light");
    } catch {
      /* ignore */
    }
  };

  const switchClass = `gtn-settings-switch${isDark ? " on" : ""}${className ? ` ${className}` : ""}`;

  if (!mounted) {
    return (
      <button
        type="button"
        disabled
        aria-label={label}
        aria-busy="true"
        className={`gtn-settings-switch${className ? ` ${className}` : ""}`}
      >
        <span className="gtn-settings-switch-knob" />
      </button>
    );
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={label}
      className={switchClass}
      onClick={onToggle}
    >
      <span className="gtn-settings-switch-knob" />
    </button>
  );
}
