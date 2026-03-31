"use client";

import { useEffect } from "react";

/**
 * Load lightweight polyfills only when missing.
 * This helps older Android WebViews / low-end devices without bloating modern bundles.
 */
export default function ClientPolyfills() {
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // AbortController is used by our fetch timeout wrappers.
        if (typeof AbortController === "undefined") {
          await import("abortcontroller-polyfill/dist/abortcontroller-polyfill-only");
        }

        // URLSearchParams is used for auth + dashboard routing.
        if (typeof URLSearchParams === "undefined") {
          await import("url-search-params-polyfill");
        }
      } catch {
        // If polyfills fail to load, we still want the app to render.
      }
    })();

    return () => {
      cancelled = true;
      void cancelled;
    };
  }, []);

  return null;
}

