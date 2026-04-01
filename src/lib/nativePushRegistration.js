"use client";

import axios from "@/services/api";

/**
 * Register FCM token with GTN API (native Android/iOS only). Enables incoming-call push when socket is offline.
 */
export async function registerNativePushToken() {
  if (typeof window === "undefined") return;
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return;

    const { PushNotifications } = await import("@capacitor/push-notifications");

    let perm = await PushNotifications.checkPermissions();
    if (perm.receive !== "granted") {
      perm = await PushNotifications.requestPermissions();
    }
    if (perm.receive !== "granted") return;

    await PushNotifications.removeAllListeners();

    PushNotifications.addListener("registration", async ({ value }) => {
      if (!value) return;
      try {
        await axios.post("/users/me/push-token", {
          token: value,
          platform: Capacitor.getPlatform(),
        });
      } catch (e) {
        console.warn("[GTN push] Failed to register token with API", e?.message || e);
      }
    });

    PushNotifications.addListener("registrationError", (err) => {
      console.warn("[GTN push] registrationError", err);
    });

    await PushNotifications.register();
  } catch (e) {
    console.warn("[GTN push] Native registration skipped:", e?.message || e);
  }
}
