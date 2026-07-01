"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "refineai_seen_version";
const POLL_MS = 60_000;

export default function UpdateBanner() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);

  const checkVersion = useCallback(async () => {
    try {
      const res = await fetch("/api/version", { cache: "no-store" });
      if (!res.ok) return;
      const { version } = (await res.json()) as { version: string };
      const seen = localStorage.getItem(STORAGE_KEY);

      if (!seen) {
        localStorage.setItem(STORAGE_KEY, version);
        setUpdateAvailable(false);
        return;
      }

      if (seen !== version) {
        setLatestVersion(version);
        setUpdateAvailable(true);
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

  const handleRefresh = () => {
    if (latestVersion) {
      localStorage.setItem(STORAGE_KEY, latestVersion);
    }
    window.location.reload();
  };

  if (!updateAvailable) return null;

  return (
    <button
      type="button"
      onClick={handleRefresh}
      className="fixed inset-x-0 top-0 z-[100] flex min-h-[44px] items-center justify-center gap-2 bg-indigo-600/95 px-4 py-2.5 text-center text-sm font-medium text-white backdrop-blur-sm transition hover:bg-indigo-500/95"
      style={{ paddingTop: "max(0.625rem, env(safe-area-inset-top))" }}
    >
      <span>New update available — tap to refresh</span>
      {latestVersion && (
        <span className="rounded bg-white/20 px-1.5 py-0.5 text-xs">v{latestVersion}</span>
      )}
    </button>
  );
}
