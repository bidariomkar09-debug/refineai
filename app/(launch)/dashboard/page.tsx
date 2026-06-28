"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type RecentProject = {
  id: string;
  name: string;
  status: string;
  created_at: string;
  niche: string | null;
};

function formatRelativeDate(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function ActionCard({
  icon,
  label,
  onClick,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  href?: string;
}) {
  const className =
    "group flex flex-col justify-between rounded-lg border border-white/[0.08] bg-white/[0.03] p-4 min-h-[100px] transition-all duration-200 hover:border-white/20 hover:bg-white/[0.06]";

  const content = (
    <>
      <span className="text-gray-400 transition-colors group-hover:text-gray-200">{icon}</span>
      <span className="mt-auto text-sm text-gray-300">{label}</span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={`${className} text-left`}>
      {content}
    </button>
  );
}

export default function LaunchScreen() {
  const router = useRouter();
  const [recent, setRecent] = useState<RecentProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showClone, setShowClone] = useState(false);
  const [cloneUrl, setCloneUrl] = useState("");
  const [cloning, setCloning] = useState(false);
  const [cloneError, setCloneError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/projects?stats=true")
      .then((r) => r.json())
      .then((data) => setRecent((data.projects ?? []).slice(0, 5)))
      .catch(() => setRecent([]))
      .finally(() => setLoading(false));
  }, []);

  const handleClone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cloneUrl.trim()) return;
    setCloning(true);
    setCloneError(null);
    try {
      const res = await fetch("/api/clone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: cloneUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCloneError(data.error ?? "Clone failed");
        return;
      }
      router.push(`/workspace?projectId=${data.projectId}`);
    } catch {
      setCloneError("Something went wrong. Try again.");
    } finally {
      setCloning(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center bg-[#0a0a0a] px-5 py-12 motion-safe:animate-fade-in">
      <div className="w-full max-w-[500px]">
        {/* Brand */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center">
            <span className="text-5xl font-light text-indigo-500">∞</span>
          </div>
          <h1 className="text-lg font-semibold tracking-[0.2em] text-white">REFINEAI</h1>
          <p className="mt-2 text-sm text-gray-500">
            Pro ·{" "}
            <Link href="/settings" className="transition-colors hover:text-gray-300">
              Settings
            </Link>
          </p>
        </div>

        {/* Action cards */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
          <ActionCard
            href="/workspace"
            label="New Project"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            }
          />
          <ActionCard
            href="/projects"
            label="Open Project"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V6A2.25 2.25 0 014.5 3.75h4.318a2.25 2.25 0 011.591.659l1.182 1.182A2.25 2.25 0 0015.318 6H19.5A2.25 2.25 0 0121.75 8.25v9.5A2.25 2.25 0 0119.5 20.25H4.5A2.25 2.25 0 012.25 18V12.75z" />
              </svg>
            }
          />
          <ActionCard
            label="Clone Repo"
            onClick={() => {
              setShowClone(true);
              setCloneError(null);
            }}
            icon={
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.395-.135-.345-.72-1.395-1.23-1.665-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
            }
          />
        </div>

        {/* Recent projects */}
        <div className="mt-10">
          <p className="mb-3 text-xs text-gray-500">Recent projects</p>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-9 animate-pulse rounded-md bg-white/[0.04]" />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <p className="text-sm text-gray-600">No recent projects</p>
          ) : (
            <ul className="space-y-0.5">
              {recent.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/workspace?projectId=${p.id}`}
                    className="flex items-center justify-between rounded-md px-2 py-2 text-sm transition-colors hover:bg-white/[0.04]"
                  >
                    <span className="truncate text-gray-200">{p.name}</span>
                    <span className="ml-4 shrink-0 text-xs text-gray-500">
                      {p.niche ?? formatRelativeDate(p.created_at)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <p className="mt-14 text-center">
          <Link
            href="/agents"
            className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-xs text-gray-400 transition-colors hover:border-white/15 hover:text-gray-300"
          >
            Try building with parallel agents →
          </Link>
        </p>
      </div>

      {/* Clone modal */}
      {showClone && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-5 backdrop-blur-sm"
          onClick={() => !cloning && setShowClone(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-white/10 bg-[#141414] p-6 motion-safe:animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-medium text-white">Clone from GitHub</h2>
            <p className="mt-1 text-sm text-gray-500">
              Paste a public repository URL to import and continue building.
            </p>
            <form onSubmit={handleClone} className="mt-4">
              <input
                type="url"
                value={cloneUrl}
                onChange={(e) => setCloneUrl(e.target.value)}
                placeholder="https://github.com/owner/repo"
                autoFocus
                disabled={cloning}
                className="w-full rounded-lg border border-white/10 bg-[#0a0a0a] px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-indigo-500/50 focus:outline-none disabled:opacity-50"
              />
              {cloneError && (
                <p className="mt-2 text-xs text-red-400">{cloneError}</p>
              )}
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  disabled={cloning}
                  onClick={() => setShowClone(false)}
                  className="flex-1 rounded-lg border border-white/10 py-2 text-sm text-gray-400 hover:text-white disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={cloning || !cloneUrl.trim()}
                  className="flex-1 rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  {cloning ? "Importing…" : "Import"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
