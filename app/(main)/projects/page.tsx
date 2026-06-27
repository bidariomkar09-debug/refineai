"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ProjectWithStats } from "@/app/lib/settingsTypes";
import PageHeader from "@/app/components/shell/PageHeader";
import LoadingState from "@/app/components/shell/LoadingState";
import EmptyState from "@/app/components/shell/EmptyState";
import PullToRefresh from "@/app/components/mobile/PullToRefresh";
import SwipeableRow from "@/app/components/mobile/SwipeableRow";

type SortKey = "date" | "score" | "name";
type StatusFilter = "all" | "planning" | "building" | "complete" | "paused";

function formatStatus(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function statusColor(status: string) {
  switch (status) {
    case "complete":
      return "bg-emerald-500/20 text-emerald-400";
    case "building":
      return "bg-indigo-500/20 text-indigo-400";
    case "planning":
      return "bg-amber-500/20 text-amber-400";
    default:
      return "bg-gray-500/20 text-gray-400";
  }
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortKey>("date");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadProjects = useCallback(() => {
    setLoading(true);
    fetch("/api/projects?stats=true")
      .then((r) => r.json())
      .then((data) => setProjects(data.projects ?? []))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const filtered = useMemo(() => {
    let list = [...projects];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.niche?.toLowerCase().includes(q) ?? false)
      );
    }
    if (statusFilter !== "all") {
      list = list.filter((p) => p.status === statusFilter);
    }
    list.sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "score") return b.avgScore - a.avgScore;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return list;
  }, [projects, search, statusFilter, sortBy]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/projects?id=${id}`, { method: "DELETE" });
      if (res.ok) setProjects((prev) => prev.filter((p) => p.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <PullToRefresh onRefresh={loadProjects}>
    <div className="overflow-x-hidden">
      <PageHeader
        title="Projects"
        description="All your AI-generated projects in one place."
        crumbs={[{ label: "RefineAI", href: "/dashboard" }, { label: "Projects" }]}
        action={
          <Link
            href="/workspace"
            className="block w-full min-h-[44px] rounded-lg bg-indigo-600 px-4 py-2 text-center text-sm font-medium text-white transition hover:bg-indigo-500 sm:w-auto"
          >
            New Project
          </Link>
        }
      />

      <div className="mb-6 flex flex-col gap-3">
        <input
          type="search"
          placeholder="Search projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-h-[44px] flex-1 rounded-lg border border-white/10 bg-[#16161f] px-4 py-2 text-base text-white placeholder:text-gray-500 focus:border-indigo-500 focus:outline-none"
        />
        <div className="flex flex-col gap-3 sm:flex-row">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="min-h-[44px] flex-1 rounded-lg border border-white/10 bg-[#16161f] px-3 py-2 text-base text-white focus:border-indigo-500 focus:outline-none"
        >
          <option value="all">All statuses</option>
          <option value="planning">Planning</option>
          <option value="building">Building</option>
          <option value="complete">Complete</option>
          <option value="paused">Paused</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortKey)}
          className="min-h-[44px] flex-1 rounded-lg border border-white/10 bg-[#16161f] px-3 py-2 text-base text-white focus:border-indigo-500 focus:outline-none"
        >
          <option value="date">Sort by date</option>
          <option value="score">Sort by score</option>
          <option value="name">Sort by name</option>
        </select>
        </div>
      </div>

      {loading ? (
        <LoadingState />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={projects.length === 0 ? "No projects yet" : "No matching projects"}
          description={
            projects.length === 0
              ? "Create your first project to get started."
              : "Try adjusting your search or filters."
          }
          action={
            projects.length === 0 ? (
              <Link
                href="/workspace"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
              >
                Start New Project
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => (
            <SwipeableRow key={p.id} onDelete={() => handleDelete(p.id, p.name)}>
            <article
              className="flex flex-col rounded-xl border border-white/10 bg-[#16161f] p-5 transition hover:border-indigo-500/30"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-medium text-white line-clamp-1">{p.name}</h3>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${statusColor(p.status)}`}>
                  {formatStatus(p.status)}
                </span>
              </div>
              {p.niche && <p className="mt-1 text-sm text-gray-400">{p.niche}</p>}
              <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-gray-500">Files</dt>
                  <dd className="text-white">{p.doneCount}/{p.fileCount}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Avg score</dt>
                  <dd className="text-white">{p.avgScore > 0 ? `${p.avgScore}%` : "—"}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-gray-500">Created</dt>
                  <dd className="text-white">
                    {new Date(p.created_at).toLocaleDateString()}
                  </dd>
                </div>
              </dl>
              <div className="mt-auto flex gap-2 pt-4">
                <Link
                  href={`/workspace?projectId=${p.id}`}
                  className="min-h-[44px] flex-1 rounded-lg bg-indigo-600 py-2 text-center text-sm font-medium leading-[44px] text-white hover:bg-indigo-500 sm:leading-normal"
                >
                  Open
                </Link>
                <button
                  type="button"
                  disabled={deletingId === p.id}
                  onClick={() => handleDelete(p.id, p.name)}
                  className="min-h-[44px] rounded-lg border border-red-500/30 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 disabled:opacity-50 md:hidden"
                >
                  Delete
                </button>
              </div>
            </article>
            </SwipeableRow>
          ))}
        </div>
      )}
    </div>
    </PullToRefresh>
  );
}
