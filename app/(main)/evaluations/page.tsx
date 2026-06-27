"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { EvaluationStats } from "@/app/lib/settingsTypes";
import PageHeader from "@/app/components/shell/PageHeader";
import StatCard from "@/app/components/shell/StatCard";
import LoadingState from "@/app/components/shell/LoadingState";
import EmptyState from "@/app/components/shell/EmptyState";

const chartTooltipStyle = {
  backgroundColor: "#16161f",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "8px",
  color: "#fff",
};

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

  if (loading) return <LoadingState />;
  if (!stats) {
    return <EmptyState title="Could not load evaluations" />;
  }

  const hasData = stats.projectScores.length > 0 || stats.totalRounds > 0;

  return (
    <div>
      <PageHeader
        title="Evaluations"
        description="Quality analytics across all your projects."
        crumbs={[{ label: "RefineAI", href: "/dashboard" }, { label: "Evaluations" }]}
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
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
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-white/10 bg-[#16161f] p-5">
            <h2 className="mb-4 text-sm font-medium text-gray-300">Average Score per Project</h2>
            {stats.projectScores.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={stats.projectScores}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: "#9ca3af", fontSize: 11 }} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Bar dataKey="score" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-500">No project scores yet.</p>
            )}
          </section>

          <section className="rounded-xl border border-white/10 bg-[#16161f] p-5">
            <h2 className="mb-4 text-sm font-medium text-gray-300">Score by Refinement Round</h2>
            {stats.roundScores.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={stats.roundScores}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis dataKey="round" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: "#9ca3af", fontSize: 11 }} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2} dot={{ fill: "#6366f1" }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-500">No round data yet.</p>
            )}
          </section>

          <section className="rounded-xl border border-white/10 bg-[#16161f] p-5">
            <h2 className="mb-4 text-sm font-medium text-gray-300">Common Issues in Critiques</h2>
            <ul className="space-y-2">
              {stats.commonIssues.map((issue) => (
                <li
                  key={issue}
                  className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-sm text-gray-300"
                >
                  {issue}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-white/10 bg-[#16161f] p-5">
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
        </div>
      )}
    </div>
  );
}
