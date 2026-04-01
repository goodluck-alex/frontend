"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import axios from "@/services/api";
import MobileShell from "@/components/MobileShell";
import DialPad from "@/components/DialPad";
import CallHistory from "@/components/CallHistory";
import Messages from "@/components/Messages";
import VoiceRooms from "@/components/VoiceRooms";
import Plans from "@/components/Plans";
import GtnSettings from "@/components/GtnSettings";
import FindFriendsReminder from "@/components/FindFriendsReminder";
import { ChatSocketProvider } from "@/contexts/chatSocketContext";
import { VoiceCallProvider } from "@/contexts/voiceCallContext";
import { ContactsProvider } from "@/contexts/contactsContext";
import { useLocale } from "@/contexts/localeContext";

const TAB_IDS = ["dial", "messages", "history", "rooms", "plans", "settings"];

const SETTINGS_SECTION_IDS = new Set([
  "account",
  "contacts",
  "security",
  "calls",
  "rooms",
  "chat",
  "notifications",
  "referral",
  "data",
  "appearance",
  "about",
  "privacy",
  "terms",
  "contact",
  "support",
]);

function normalizeTabFromQuery(tabParam, sectionParam) {
  if (tabParam === "more") {
    if (sectionParam === "wallet") return "plans";
    if (sectionParam === "voice") return "rooms";
    if (sectionParam === "referrals") return "settings";
    if (sectionParam === "settings") return "settings";
    return "settings";
  }
  if (TAB_IDS.includes(tabParam)) return tabParam;
  return "dial";
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab");
  const sectionParam = searchParams.get("section");
  const settingsSectionParam = searchParams.get("settingsSection");

  const initialTab = normalizeTabFromQuery(tabParam, sectionParam);
  const [tab, setTab] = useState(initialTab);

  const urlTab = normalizeTabFromQuery(tabParam, sectionParam);
  let validSettingsSection = null;
  if (urlTab === "settings") {
    if (settingsSectionParam && SETTINGS_SECTION_IDS.has(settingsSectionParam)) {
      validSettingsSection = settingsSectionParam;
    } else if (tabParam === "more" && sectionParam === "referrals") {
      validSettingsSection = "referral";
    }
  }

  const { applyUserProfile } = useLocale();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = normalizeTabFromQuery(searchParams.get("tab"), searchParams.get("section"));
    if (TAB_IDS.includes(t)) setTab(t);
  }, [searchParams]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axios.get("/users/me");
        setUser(res.data);
        if (res.data?.currencyCode) {
          applyUserProfile(res.data);
        }
      } catch (err) {
        // If a token exists but /users/me fails, treat it as an expired/revoked session.
        try {
          const token = typeof window !== "undefined" ? window.localStorage.getItem("gtn_token") : null;
          const status = err?.status;
          if (token && (status === 401 || status === 403)) {
            window.localStorage.removeItem("gtn_token");
            router.replace("/login");
            return;
          }
        } catch {
          /* ignore */
        }

        console.warn("Failed to fetch user info, using guest mode:", err);
        setUser({
          id: null,
          dbId: null,
          username: "Guest",
        });
      }
      setLoading(false);
    };
    fetchUser();
  }, [applyUserProfile, router]);

  useEffect(() => {
    if (!user?.dbId) return;
    const onUserUpdated = (e) => {
      const d = e.detail || {};
      setUser((u) => {
        if (!u || !u.dbId) return u;
        const next = { ...u };
        if (typeof d.freeMinutes === "number" && !Number.isNaN(d.freeMinutes)) next.freeMinutes = d.freeMinutes;
        if (typeof d.planId === "string") next.planId = d.planId;
        if (typeof d.planName === "string") next.planName = d.planName;
        if (typeof d.planUnlimited === "boolean") next.planUnlimited = d.planUnlimited;
        if (typeof d.planExpiry === "string" || d.planExpiry === null) next.planExpiry = d.planExpiry;
        return next;
      });
    };
    window.addEventListener("gtn-user-updated", onUserUpdated);
    return () => window.removeEventListener("gtn-user-updated", onUserUpdated);
  }, [user?.dbId]);

  const setTabAndUrl = useCallback(
    (next) => {
      setTab(next);
      const params = new URLSearchParams();
      params.set("tab", next);
      router.replace(`/dashboard?${params.toString()}`, { scroll: false });
    },
    [router]
  );

  const onNavigateTab = useCallback(
    (next) => {
      setTab(next);
      router.replace(`/dashboard?tab=${encodeURIComponent(next)}`, { scroll: false });
    },
    [router]
  );

  const navigateToSettingsSection = useCallback(
    (sectionId) => {
      const p = new URLSearchParams();
      p.set("tab", "settings");
      if (sectionId) p.set("settingsSection", sectionId);
      router.replace(`/dashboard?${p.toString()}`, { scroll: false });
    },
    [router]
  );

  const openContactsInSettings = useCallback(() => navigateToSettingsSection("contacts"), [navigateToSettingsSection]);

  const LoadingScreen = ({ subtitle }) => (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-950 to-slate-900 text-slate-100">
      <div className="flex flex-col items-center">
        <div className="relative flex items-center justify-center">
          <div
            className="h-16 w-16 rounded-full border-[3px] border-white/30 border-t-cyan-400 border-r-emerald-400 animate-[spin_1.8s_linear_infinite]"
            aria-hidden
          />
          <img
            src="/gtn-icon.png"
            alt="GTN"
            className="absolute h-11 w-11 rounded-2xl shadow-lg"
            draggable={false}
          />
        </div>
        <div className="mt-5 text-sm text-slate-300">{subtitle}</div>
      </div>
    </div>
  );

  if (loading) {
    return <LoadingScreen subtitle="Loading your telecom workspace..." />;
  }

  return (
    <ChatSocketProvider user={user}>
      <VoiceCallProvider user={user}>
        <ContactsProvider user={user}>
          <div className="gtn-dashboard-wrap">
            <FindFriendsReminder user={user} />
            <MobileShell tab={tab} onTabChange={setTabAndUrl} user={user}>
              {(active) => {
                switch (active) {
                  case "dial":
                    return <DialPad user={user} onOpenContactsSettings={openContactsInSettings} />;
                  case "messages":
                    return <Messages user={user} onOpenContactsSettings={openContactsInSettings} />;
                  case "history":
                    return <CallHistory user={user} />;
                  case "rooms":
                    return (
                      <VoiceRooms
                        user={user}
                        onOpenContactsSettings={openContactsInSettings}
                        onNavigateTab={onNavigateTab}
                      />
                    );
                  case "plans":
                    return <Plans user={user} />;
                  case "settings":
                    return (
                      <GtnSettings
                        user={user}
                        initialSection={validSettingsSection}
                        onNavigateTab={onNavigateTab}
                        onUserUpdated={setUser}
                      />
                    );
                  default:
                    return <DialPad user={user} onOpenContactsSettings={openContactsInSettings} />;
                }
              }}
            </MobileShell>
          </div>
        </ContactsProvider>
      </VoiceCallProvider>
    </ChatSocketProvider>
  );
}

export default function Dashboard() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-950 to-slate-900 text-slate-100">
          <div className="flex flex-col items-center">
            <div className="relative flex items-center justify-center">
              <div
                className="h-16 w-16 rounded-full border-[3px] border-white/30 border-t-cyan-400 border-r-emerald-400 animate-[spin_1.8s_linear_infinite]"
                aria-hidden
              />
              <img
                src="/gtn-icon.png"
                alt="GTN"
                className="absolute h-11 w-11 rounded-2xl shadow-lg"
                draggable={false}
              />
            </div>
            <div className="mt-5 text-sm text-slate-300">Loading…</div>
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
