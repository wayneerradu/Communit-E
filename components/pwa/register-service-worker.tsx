"use client";

import { useEffect } from "react";

export function RegisterServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }
    const isProduction = process.env.NODE_ENV === "production";

    if (!isProduction) {
      // Keep development responsive by removing any previously registered SW and stale caches.
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
        .catch(() => {});
      if ("caches" in window) {
        caches
          .keys()
          .then((keys) => Promise.all(keys.filter((key) => key.startsWith("communite-cache-")).map((key) => caches.delete(key))))
          .catch(() => {});
      }
      return;
    }

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        registration.update().catch(() => {});
      } catch {
        // Registration failures are non-blocking for the app.
      }
    };

    if (document.readyState === "complete") {
      void register();
      return;
    }

    const onLoad = () => {
      void register();
    };

    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  return null;
}
