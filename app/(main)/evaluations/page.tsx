"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import type { EvaluationStats } from "@/app/lib/settingsTypes";
import PageHeader from "@/app/components/shell/PageHeader";
import StatCard from "@/app/components/shell/StatCard";
import SkeletonCard from "@/app/components/mobile/SkeletonCard";
import EmptyState from "@/app/components/shell/EmptyState";

const EvaluationCharts = dynamic(() => import("@/app/components/evaluations/EvaluationCharts"), {
  ssr: false,
  loading: () => (
    <div className="grid gap-6 lg:grid-cols-2">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="h-64 animate-pulse rounded-xl border border-white/10 bg-[#16161f]" />
      ))}
    </div>
  ),
});

export default function EvaluationsPage() {
  const [stats, setStats] = useState<EvaluationStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/evaluations")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  const { bestTypes, worstTypes } = useMemo(() => {
    if (!stats?.fileTypeScores.length) return { bestTypes: [], worstTypes: [] };
    const sorted = [...stats.fileTypeScores].sort((a, b) => b.score - a.score);
    return {
      bestTypes: sorted.slice(0, 3),
      worstTypes: [...sorted].reverse().slice(0, 3),
    };
  }, [stats]);

  const roundsRatio =
    stats && stats.totalFilesBuilt > 0
      ? (stats.totalRounds / stats.totalFilesBuilt).toFixed(1)
      : "—";

  if (loading) {
    return (
      <div>
        <div className="mb-6 h-8 w-40 animate-pulse rounded bg-white/10" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return <EmptyState title="Could not load evaluations" />;
  }

  const hasData = stats.projectScores.length > 0 || stats.totalRounds > 0;

  return (
    <div className="overflow-x-hidden">
      <PageHeader
        title="Evaluations"
        description="Quality analytics across all your projects."
        crumbs={[{ label: "RefineAI", href: "/dashboard" }, { label: "Evaluations" }]}
      />

      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatCard label="Total Rounds" value={stats.totalRounds} />
        <StatCard label="Files Built" value={stats.totalFilesBuilt} />
        <StatCard label="Rounds / File" value={roundsRatio} />
      </div>

      {!hasData ? (
        <EmptyState
          title="No evaluation data yet"
          description="Build a project to see quality analytics here."
        />
      ) : (
        <>
          <EvaluationCharts stats={stats} />
          <section className="mt-6 rounded-xl border border-white/10 bg-[#16161f] p-5">
            <h2 className="mb-4 text-sm font-medium text-gray-300">File Type Performance</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <h3 className="mb-2 text-xs uppercase tracking-wide text-emerald-400">Best performing</h3>
                <ul className="space-y-1 text-sm">
                  {bestTypes.length > 0 ? (
                    bestTypes.map((t) => (
                      <li key={t.type} className="text-gray-300">
                        {t.type} — {t.score}% ({t.count} files)
                      </li>
                    ))
                  ) : (
                    <li className="text-gray-500">No data</li>
                  )}
                </ul>
              </div>
              <div>
                <h3 className="mb-2 text-xs uppercase tracking-wide text-red-400">Needs improvement</h3>
                <ul className="space-y-1 text-sm">
                  {worstTypes.length > 0 ? (
                    worstTypes.map((t) => (
                      <li key={t.type} className="text-gray-300">
                        {t.type} — {t.score}% ({t.count} files)
                      </li>
                    ))
                  ) : (
                    <li className="text-gray-500">No data</li>
                  )}
                </ul>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
