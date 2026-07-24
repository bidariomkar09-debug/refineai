"use client";

import { useEffect } from "react";

export default function PWARegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        // Prompt update check when a new SW is waiting
        if (reg.waiting) {
          reg.waiting.postMessage({ type: "CLEAR_CACHE" });
        }
        reg.addEventListener("updatefound", () => {
          const worker = reg.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              // New SW ready — version poll will show UpdatePopup
            }
          });
        });
      })
      .catch(() => {
        /* silent fail */
      });
  }, []);

  return null;
}
