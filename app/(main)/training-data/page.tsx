"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  TrainingDataResponse,
  TrainingDataSessionRow,
  TrainingDataStats,
} from "@/app/lib/settingsTypes";
import PageHeader from "@/app/components/shell/PageHeader";
import StatCard from "@/app/components/shell/StatCard";
import SkeletonCard from "@/app/components/mobile/SkeletonCard";
import EmptyState from "@/app/components/shell/EmptyState";
import TrainingReadiness from "@/app/components/training/TrainingReadiness";
import TrainingTable from "@/app/components/training/TrainingTable";

const FILE_TYPES = [".tsx", ".ts", ".css", ".json", ".md", ".sql", ".jsx", ".js"] as const;

const EMPTY_STATS: TrainingDataStats = {
  totalExamples: 0,
  successfulLoops: 0,
  avgRoundsToComplete: 0,
  fileTypeBreakdown: [],
  thisWeekCount: 0,
  qualityExamples: 0,
  uniqueFileTypes: 0,
  readinessPercent: 0,
  milestones: { bronze: false, silver: false, gold: false, diamond: false },
};

export default function TrainingDataPage() {
  const [stats, setStats] = useState<TrainingDataStats>(EMPTY_STATS);
  const [sessions, setSessions] = useState<TrainingDataSessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);

  const [successfulOnly, setSuccessfulOnly] = useState(false);
  const [minScore95, setMinScore95] = useState(false);
  const [fileType, setFileType] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (successfulOnly) params.set("successful", "true");
    if (minScore95) params.set("minScore", "95");
    if (fileType !== "all") params.set("fileType", fileType);
    if (fromDate) params.set("from", new Date(fromDate).toISOString());
    if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      params.set("to", end.toISOString());
    }
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  }, [successfulOnly, minScore95, fileType, fromDate, toDate]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/training-data${queryString}`);
      if (!res.ok) throw new Error("Failed");
      const data: TrainingDataResponse = await res.json();
      setStats(data.stats ?? EMPTY_STATS);
      setSessions(data.sessions ?? []);
    } catch {
      setStats(EMPTY_STATS);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const topFileType = stats.fileTypeBreakdown[0]?.type ?? "—";

  const handleExport = async (format: string, filename: string) => {
    setExporting(format);
    try {
      const sep = queryString ? `${queryString}&` : "?";
      const res = await fetch(`/api/training-data/export${sep}format=${format}`);
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(null);
    }
  };

  if (loading && stats.totalExamples === 0) {
    return (
      <div>
        <div className="mb-6 h-8 w-48 animate-pulse rounded bg-white/10" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-hidden">
      <PageHeader
        title="Training Data"
        description="Automatically collected examples for fine-tuning your own AI model."
        crumbs={[
          { label: "RefineAI", href: "/dashboard" },
          { label: "Training Data" },
        ]}
      />

      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Total examples" value={stats.totalExamples} />
        <StatCard label="Successful loops" value={stats.successfulLoops} />
        <StatCard label="Avg rounds" value={stats.avgRoundsToComplete} />
        <StatCard label="Top file type" value={topFileType} />
        <StatCard label="This week" value={stats.thisWeekCount} />
        <StatCard label="Readiness" value={`${stats.readinessPercent}%`} />
      </div>

      <TrainingReadiness stats={stats} />

      <section className="mb-6 rounded-xl border border-white/10 bg-[#16161f] p-5">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-gray-400">
          Export Training Data
        </h2>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={stats.totalExamples === 0 || exporting !== null}
            onClick={() => handleExport("openai", "refineai-openai-finetuning.jsonl")}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white hover:border-indigo-500 disabled:opacity-50"
          >
            {exporting === "openai" ? "Exporting…" : "Export OpenAI (JSONL)"}
          </button>
          <button
            type="button"
            disabled={stats.totalExamples === 0 || exporting !== null}
            onClick={() =>
              handleExport("huggingface", "refineai-huggingface-dataset.json")
            }
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white hover:border-indigo-500 disabled:opacity-50"
          >
            {exporting === "huggingface" ? "Exporting…" : "Export Hugging Face (JSON)"}
          </button>
          <button
            type="button"
            disabled={stats.totalExamples === 0 || exporting !== null}
            onClick={() => handleExport("csv", "refineai-training-data.csv")}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white hover:border-indigo-500 disabled:opacity-50"
          >
            {exporting === "csv" ? "Exporting…" : "Export CSV"}
          </button>
        </div>
      </section>

      <section className="mb-6 rounded-xl border border-white/10 bg-[#16161f] p-5">
        <h2 className="mb-4 text-sm font-medium text-gray-300">Filters</h2>
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={successfulOnly}
              onChange={(e) => setSuccessfulOnly(e.target.checked)}
              className="accent-indigo-500"
            />
            Successful only
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={minScore95}
              onChange={(e) => setMinScore95(e.target.checked)}
              className="accent-indigo-500"
            />
            Score ≥ 95%
          </label>
          <select
            value={fileType}
            onChange={(e) => setFileType(e.target.value)}
            className="rounded-lg border border-white/10 bg-[#0f0f12] px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">All file types</option>
            {FILE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="rounded-lg border border-white/10 bg-[#0f0f12] px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="rounded-lg border border-white/10 bg-[#0f0f12] px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-[#16161f] p-5">
        <h2 className="mb-4 text-sm font-medium text-gray-300">Training Examples</h2>
        {stats.totalExamples === 0 ? (
          <EmptyState
            title="No training data yet"
            description="Build a project to automatically collect training examples from every loop."
          />
        ) : (
          <TrainingTable sessions={sessions} />
        )}
      </section>
    </div>
  );
}
