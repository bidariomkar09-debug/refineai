"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { DashboardStats } from "@/app/lib/settingsTypes";
import PageHeader from "@/app/components/shell/PageHeader";
import StatCard from "@/app/components/shell/StatCard";
import LoadingState from "@/app/components/shell/LoadingState";
import EmptyState from "@/app/components/shell/EmptyState";

function formatStatus(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [accountName, setAccountName] = useState("Developer");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetch("/api/stats"), fetch("/api/settings")])
      .then(async ([statsRes, settingsRes]) => {
        if (!statsRes.ok) throw new Error("Failed to load dashboard");
        const statsData = await statsRes.json();
        setStats(statsData);
        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          if (settingsData.settings?.account_name) {
            setAccountName(settingsData.settings.account_name);
          }
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState message="Loading dashboard..." />;
  if (error || !stats) {
    return (
      <EmptyState
        title="Could not load dashboard"
        description={error ?? "Unknown error"}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${accountName}`}
        description="Here's what's happening with your AI builds."
        crumbs={[{ label: "RefineAI", href: "/dashboard" }, { label: "Dashboard" }]}
        action={
          <Link
            href="/workspace"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
          >
            Start New Project
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Projects" value={stats.totalProjects} />
        <StatCard label="Files Generated" value={stats.totalFiles} />
        <StatCard
          label="Average Quality"
          value={stats.averageScore || "—"}
          suffix={stats.averageScore ? "%" : undefined}
        />
        <StatCard label="Total Loops Run" value={stats.totalLoops} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-white/10 bg-[#16161f] p-5">
          <h2 className="mb-4 text-lg font-medium text-white">Recent Projects</h2>
          {stats.recentProjects.length === 0 ? (
            <p className="text-sm text-gray-400">No projects yet. Start your first build!</p>
          ) : (
            <ul className="space-y-3">
              {stats.recentProjects.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-white">{p.name}</p>
                    <p className="text-xs text-gray-500">
                      {formatStatus(p.status)} · {p.fileCount} files ·{" "}
                      {p.avgScore > 0 ? `${p.avgScore}% avg` : "No scores yet"}
                    </p>
                  </div>
                  <Link
                    href={`/workspace?projectId=${p.id}`}
                    className="text-sm text-indigo-400 hover:text-indigo-300"
                  >
                    Open
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-white/10 bg-[#16161f] p-5">
          <h2 className="mb-4 text-lg font-medium text-white">Activity Feed</h2>
          {stats.activity.length === 0 ? (
            <p className="text-sm text-gray-400">No recent activity.</p>
          ) : (
            <ul className="space-y-3">
              {stats.activity.map((a) => (
                <li key={a.id} className="border-l-2 border-indigo-500/40 pl-4">
                  <p className="text-sm text-gray-200">{a.message}</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {a.projectName} · {formatDate(a.timestamp)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
