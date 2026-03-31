"use client";

import { useState, useEffect } from "react";
import { IoChevronBackOutline } from "react-icons/io5";
import Image from "next/image";
import { useLocale } from "@/contexts/localeContext";

/** Bottom bar: Dial | Chat | History | Rooms | Plans | Settings — single row */
const TABS = [
  { id: "dial", label: "Dial", emoji: "📞" },
  { id: "messages", label: "Chat", emoji: "💬" },
  { id: "history", label: "History", emoji: "🕘" },
  { id: "rooms", label: "Rooms", emoji: "🎙️" },
  { id: "plans", label: "Plans", emoji: "📶" },
  { id: "settings", label: "Settings", emoji: "⚙️" },
];

export default function MobileShell({ tab, onTabChange, user, children }) {
  const [prevTab, setPrevTab] = useState(tab || "dial");
  const [theme, setTheme] = useState("dark");
  const { currencyCode, currencySymbol } = useLocale();
  const hasAccount = Boolean(user?.dbId != null);
  const phoneId = hasAccount ? user?.id || "" : "";
  const activeTab = tab || "dial";
  const planName = hasAccount ? user?.planName || "Free Plan" : "";
  const planExpiryIso = hasAccount ? user?.planExpiry || null : null;
  const planIsUnlimited = Boolean(hasAccount && user?.planUnlimited);

  const formatExpiry = (iso) => {
    if (!iso) return "";
    const ms = new Date(iso).getTime() - Date.now();
    if (!Number.isFinite(ms)) return "";
    if (ms <= 0) return "Expired";
    const totalMins = Math.floor(ms / 60000);
    const d = Math.floor(totalMins / (60 * 24));
    const h = Math.floor((totalMins - d * 24 * 60) / 60);
    const m = totalMins - d * 24 * 60 - h * 60;
    if (d > 0) return `Expires in: ${d}d ${h}h`;
    return `Expires in: ${h}h ${m}m`;
  };

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem("gtn_theme") : null;
    const next = saved || "dark";
    setTheme(next);
    document.body.classList.toggle("dark", next === "dark");
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.body.classList.toggle("dark", next === "dark");
    if (typeof window !== "undefined") {
      window.localStorage.setItem("gtn_theme", next);
    }
  };

  const onChangeTab = (tabId) => {
    setPrevTab(activeTab);
    onTabChange?.(tabId);
  };

  return (
    <div className="mobile-shell-root">
      <div className="mobile-shell-frame">
        <div className="mobile-appbar">
          <button
            type="button"
            className="mobile-appbar-back"
            onClick={() => onTabChange?.(prevTab)}
            aria-label="Back"
          >
            <IoChevronBackOutline size={20} />
          </button>

          <div className="mobile-appbar-brand">
            <Image src="/gtn-header-logo.png" alt="GTN icon" width={20} height={20} />
            <span className="mobile-appbar-phoneid">{phoneId}</span>
          </div>

          <div className="mobile-appbar-right">
            {hasAccount && (
              <div className="mobile-appbar-balance" title={planIsUnlimited ? formatExpiry(planExpiryIso) : ""}>
                Plan: {planName}
              </div>
            )}
            <button
              type="button"
              onClick={toggleTheme}
              className="mobile-appbar-theme-toggle"
              aria-label="Toggle theme"
              title="Toggle theme"
            >
              {theme === "dark" ? "☀" : "🌙"}
            </button>
          </div>
        </div>

        <div className="mobile-shell-statusbar">
          <div className="mobile-shell-appicon">
            <Image src="/gtn-header-logo.png" alt="GTN icon" width={22} height={22} />
          </div>
          <div className="mobile-shell-spacer" />
          <button
            type="button"
            onClick={toggleTheme}
            className="mobile-shell-theme-toggle"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? "☀" : "🌙"}
          </button>
        </div>

        <div className="mobile-shell-header">
          <div>
            <div className="mobile-shell-hello">Hello{user?.username ? "," : ""}</div>
            <div className="mobile-shell-name">{user?.username || "Guest"}</div>
          </div>
          <div className="mobile-shell-balance">
            <span className="mobile-shell-balance-label">Your Plan</span>
            <span className="mobile-shell-balance-value">{hasAccount ? planName : "—"}</span>
            {hasAccount && planIsUnlimited && planExpiryIso && (
              <span className="mobile-shell-balance-sub">{formatExpiry(planExpiryIso)}</span>
            )}
          </div>
        </div>

        <div className="mobile-shell-body">
          {typeof children === "function" ? children(activeTab) : children}
        </div>

        <nav className="mobile-shell-tabbar mobile-shell-tabbar--six" aria-label="Main navigation">
          {TABS.map((t) => {
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                className={active ? "mobile-shell-tab active" : "mobile-shell-tab"}
                onClick={() => onChangeTab(t.id)}
                aria-label={`${t.emoji} ${t.label}`}
                title={`${t.emoji} ${t.label}`}
              >
                <span className="mobile-shell-tab-emoji" aria-hidden>
                  {t.emoji}
                </span>
                <span className="mobile-shell-tab-label">{t.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
