"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "refineai_seen_build";
const POLL_MS = 60_000;

async function clearServiceWorkerCaches() {
  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg?.active) {
        reg.active.postMessage({ type: "CLEAR_CACHE" });
      }
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    /* best-effort */
  }
}

export default function UpdatePopup() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [latestBuildId, setLatestBuildId] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  const checkVersion = useCallback(async () => {
    try {
      const res = await fetch("/api/version", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { version: string; buildId?: string };
      const buildId = data.buildId ?? data.version;
      const seen = localStorage.getItem(STORAGE_KEY);

      if (!seen) {
        localStorage.setItem(STORAGE_KEY, buildId);
        setUpdateAvailable(false);
        return;
      }

      if (seen !== buildId) {
        setLatestVersion(data.version);
        setLatestBuildId(buildId);
        setUpdateAvailable(true);
        setDismissed(false);
      }
    } catch {
      // ignore network errors
    }
  }, []);

  useEffect(() => {
    void checkVersion();

    const interval = window.setInterval(() => void checkVersion(), POLL_MS);
    const onFocus = () => void checkVersion();
    const onVisible = () => {
      if (document.visibilityState === "visible") void checkVersion();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [checkVersion]);

  const handleUpdate = async () => {
    setUpdating(true);
    if (latestBuildId) {
      localStorage.setItem(STORAGE_KEY, latestBuildId);
    }
    await clearServiceWorkerCaches();
    window.location.reload();
  };

  if (!updateAvailable || dismissed) return null;

  return (
    <div
      className="fixed inset-x-4 z-[100] mx-auto max-w-sm md:inset-x-auto md:bottom-6 md:right-6 md:mx-0"
      style={{
        bottom: "calc(5.5rem + env(safe-area-inset-bottom, 0px))",
      }}
      role="dialog"
      aria-labelledby="update-refineai-title"
      aria-modal="false"
    >
      <div className="overflow-hidden rounded-2xl border border-indigo-500/30 bg-[#12121a] shadow-2xl shadow-black/50">
        <div className="flex items-start justify-between gap-2 border-b border-white/5 px-4 py-3">
          <div>
            <p
              id="update-refineai-title"
              className="text-sm font-semibold text-white"
            >
              Update RefineAI
            </p>
            <p className="mt-0.5 text-xs text-gray-400">
              A new version is ready
              {latestVersion ? ` · v${latestVersion}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="touch-target touch-press -mr-1 -mt-1 rounded-lg p-2 text-gray-500 hover:bg-white/5 hover:text-gray-300"
            aria-label="Dismiss"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-4 py-3">
          <button
            type="button"
            onClick={() => void handleUpdate()}
            disabled={updating}
            className="touch-press flex min-h-[44px] w-full items-center justify-center rounded-xl bg-indigo-600 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
          >
            {updating ? "Updating..." : "Update"}
          </button>
        </div>
      </div>
    </div>
  );
}
