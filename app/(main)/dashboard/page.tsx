"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { DashboardStats } from "@/app/lib/settingsTypes";
import PageHeader from "@/app/components/shell/PageHeader";
import StatCard from "@/app/components/shell/StatCard";
import SkeletonCard from "@/app/components/mobile/SkeletonCard";
import EmptyState from "@/app/components/shell/EmptyState";

function formatStatus(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
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

  if (loading) {
    return (
      <div>
        <div className="mb-6 h-8 w-48 animate-pulse rounded bg-white/10" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SkeletonCard className="h-36" />
          <SkeletonCard className="h-36" />
        </div>
      </div>
    );
  }
  if (error || !stats) {
    return (
      <EmptyState
        title="Could not load dashboard"
        description={error ?? "Unknown error"}
      />
    );
  }

  return (
    <div className="overflow-x-hidden">
      <PageHeader
        title={`Welcome back, ${accountName}`}
        description="Here's what's happening with your AI builds."
        crumbs={[{ label: "RefineAI", href: "/dashboard" }, { label: "Dashboard" }]}
        action={
          <Link
            href="/workspace"
            className="block w-full min-h-[44px] rounded-lg bg-indigo-600 px-4 py-2 text-center text-sm font-medium leading-[44px] text-white transition hover:bg-indigo-500 sm:inline-block sm:w-auto sm:leading-normal"
          >
            Start New Project
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Total Projects" value={stats.totalProjects} large />
        <StatCard
          label="Average Quality"
          value={stats.averageScore || "—"}
          suffix={stats.averageScore ? "%" : undefined}
          large
        />
      </div>

      <section className="mt-8 rounded-xl border border-white/10 bg-[#16161f] p-5 lg:p-6">
        <h2 className="mb-4 text-lg font-medium text-white">Recent Projects</h2>
        {stats.recentProjects.length === 0 ? (
          <p className="text-sm text-gray-400">No projects yet. Start your first build!</p>
        ) : (
          <ul className="space-y-3">
            {stats.recentProjects.map((p) => (
              <li
                key={p.id}
                className="flex min-h-[44px] items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-white">{p.name}</p>
                  <p className="text-xs text-gray-500">
                    {formatStatus(p.status)} · {p.fileCount} files ·{" "}
                    {p.avgScore > 0 ? `${p.avgScore}% avg` : "No scores yet"}
                  </p>
                </div>
                <Link
                  href={`/workspace?projectId=${p.id}`}
                  className="touch-target shrink-0 px-3 py-2 text-sm text-indigo-400 hover:text-indigo-300"
                >
                  Open
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
