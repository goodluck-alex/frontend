"use client";

import { useCallback, useEffect, useId, useState } from "react";
import {
  IoNotificationsOutline,
  IoCloseOutline,
  IoRefreshOutline,
  IoNotificationsOffOutline,
} from "react-icons/io5";
import { useRequestNotificationPermission } from "@/contexts/chatSocketContext";
import {
  isGtnMessageNotificationsDisabled,
  setGtnMessageNotificationsDisabled,
} from "@/lib/messageNotificationsPrefs";

const DISMISS_KEY = "gtn_notify_banner_dismissed";

/**
 * Settings row: browser notifications for new messages (tab in background).
 * Lives under More → Settings (not on the main dashboard).
 */
export default function MessageNotificationSettings({ userSignedIn }) {
  const toggleId = useId();
  const request = useRequestNotificationPermission();
  const [dismissed, setDismissed] = useState(false);
  const [perm, setPerm] = useState("default");
  const [alertsOff, setAlertsOff] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1");
    setAlertsOff(isGtnMessageNotificationsDisabled());
    if (typeof Notification !== "undefined") {
      setPerm(Notification.permission);
    }
  }, []);

  const refreshPerm = useCallback(() => {
    if (typeof Notification !== "undefined") {
      setPerm(Notification.permission);
    }
  }, []);

  const onEnable = async () => {
    setGtnMessageNotificationsDisabled(false);
    setAlertsOff(false);
    await request();
    refreshPerm();
  };

  const toggleBackgroundAlerts = () => {
    const next = !alertsOff;
    setAlertsOff(next);
    setGtnMessageNotificationsDisabled(next);
  };

  const onNotNow = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  const onAskAgain = () => {
    sessionStorage.removeItem(DISMISS_KEY);
    setDismissed(false);
  };

  if (!userSignedIn) return null;

  if (typeof Notification === "undefined") {
    return (
      <div
        className="more-settings-row more-settings-row--stack more-settings-notify more-settings-notify--center"
        role="status"
      >
        <IoNotificationsOffOutline size={22} aria-hidden />
        <span className="sr-only">Notifications not supported in this browser</span>
      </div>
    );
  }

  return (
    <div className="more-settings-row more-settings-row--stack more-settings-notify">
      <span className="sr-only">Message notifications</span>

      {perm === "granted" && (
        <div className="more-settings-notify-granted">
          <div className="more-settings-notify-toggle-row">
            <span className="sr-only" id={toggleId}>
              Background message alerts
            </span>
            <button
              type="button"
              className={`more-settings-notify-switch ${alertsOff ? "more-settings-notify-switch--off" : "more-settings-notify-switch--on"}`}
              onClick={toggleBackgroundAlerts}
              role="switch"
              aria-checked={!alertsOff}
              aria-labelledby={toggleId}
            >
              <span className="more-settings-notify-switch-knob" />
            </button>
          </div>
        </div>
      )}

      {perm === "denied" && (
        <div className="more-settings-notify-denied" role="status">
          <IoNotificationsOffOutline size={22} aria-hidden />
          <span className="sr-only">Notifications blocked for this site</span>
        </div>
      )}

      {perm === "default" && !dismissed && (
        <div className="more-settings-notify-actions">
          <button type="button" className="more-settings-notify-enable" onClick={onEnable} aria-label="Enable">
            <IoNotificationsOutline size={20} aria-hidden />
          </button>
          <button type="button" className="more-settings-notify-skip" onClick={onNotNow} aria-label="Not now">
            <IoCloseOutline size={20} aria-hidden />
          </button>
        </div>
      )}

      {perm === "default" && dismissed && (
        <button type="button" className="more-settings-notify-link" onClick={onAskAgain} aria-label="Ask again">
          <IoRefreshOutline size={18} aria-hidden />
        </button>
      )}
    </div>
  );
}
