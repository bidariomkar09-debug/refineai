"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  AppNotification,
  PipelineSettings,
  PipelineTriggerStatus,
  TrainingPipelineRun,
} from "@/app/lib/settingsTypes";
import PageHeader from "@/app/components/shell/PageHeader";
import LoadingState from "@/app/components/shell/LoadingState";

export default function TrainingPipelinePage() {
  const [history, setHistory] = useState<TrainingPipelineRun[]>([]);
  const [settings, setSettings] = useState<PipelineSettings | null>(null);
  const [trigger, setTrigger] = useState<PipelineTriggerStatus | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [activeRun, setActiveRun] = useState<TrainingPipelineRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [forcing, setForcing] = useState(false);
  const [selectedRun, setSelectedRun] = useState<TrainingPipelineRun | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/training-pipeline");
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history ?? []);
        setSettings(data.settings);
        setTrigger(data.trigger);
        setNotifications(data.notifications ?? []);
        setActiveRun(data.activeRun);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(() => {
      fetch("/api/training-pipeline/process", { method: "POST" }).catch(() => {});
      load();
    }, 120_000);
    return () => clearInterval(interval);
  }, [load]);

  const updateSettings = async (partial: Partial<PipelineSettings>) => {
    try {
      const res = await fetch("/api/training-pipeline/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partial),
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
      }
    } catch {
      // silent
    }
  };

  const forceRetrain = async () => {
    setForcing(true);
    try {
      await fetch("/api/training-pipeline/force", { method: "POST" });
      await load();
    } catch {
      // silent
    } finally {
      setForcing(false);
    }
  };

  const approveRun = async (runId: string) => {
    try {
      await fetch("/api/training-pipeline/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId }),
      });
      await load();
    } catch {
      // silent
    }
  };

  if (loading) return <LoadingState />;

  const countdownText = trigger?.hasActiveRun
    ? `Pipeline running — stage: ${activeRun?.stage ?? "…"}`
    : trigger?.isPaused
      ? "Auto training is paused"
      : trigger && trigger.daysUntilEligible > 0
        ? `Next training run in ${trigger.daysUntilEligible} day${trigger.daysUntilEligible === 1 ? "" : "s"} (need ${trigger.examplesNeeded} more examples)`
        : trigger && trigger.examplesNeeded > 0
          ? `Need ${trigger.examplesNeeded} more examples before next run`
          : "Eligible for next training run";

  return (
    <div className="overflow-x-hidden pb-24">
      <PageHeader
        title="Training Pipeline"
        description="Automated collect → clean → train → test → promote cycle."
        crumbs={[
          { label: "RefineAI", href: "/dashboard" },
          { label: "Training Pipeline" },
        ]}
      />

      {notifications.length > 0 && (
        <div className="mb-6 space-y-2">
          {notifications.slice(0, 3).map((n) => (
            <div
              key={n.id}
              className={`rounded-lg border px-4 py-3 text-sm ${
                n.type === "pipeline_promoted"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                  : n.type === "pipeline_failed"
                    ? "border-red-500/30 bg-red-500/10 text-red-200"
                    : "border-white/10 bg-[#16161f] text-gray-300"
              }`}
            >
              <p className="font-medium">{n.title}</p>
              <p className="mt-0.5 text-xs opacity-80">{n.message}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mb-6 rounded-xl border border-indigo-500/30 bg-indigo-500/5 px-5 py-4">
        <p className="text-sm text-indigo-100">{countdownText}</p>
        {activeRun && (
          <p className="mt-1 text-xs text-indigo-300/70">
            Run #{activeRun.pipeline_run_number} — {activeRun.status}
          </p>
        )}
      </div>

      <section className="mb-6 rounded-xl border border-white/10 bg-[#16161f] p-5">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-gray-400">
          Manual Controls
        </h2>
        <div className="flex flex-wrap gap-4">
          <button
            type="button"
            disabled={forcing || !!activeRun}
            onClick={forceRetrain}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {forcing ? "Starting…" : "Force Retrain Now"}
          </button>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={settings?.auto_training_paused ?? false}
              onChange={(e) => updateSettings({ auto_training_paused: e.target.checked })}
              className="accent-indigo-500"
            />
            Pause Auto Training
          </label>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={settings?.require_manual_approval ?? false}
              onChange={(e) => updateSettings({ require_manual_approval: e.target.checked })}
              className="accent-indigo-500"
            />
            Approve Manually
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-[#16161f] p-5">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-gray-400">
          Model Version History
        </h2>

        {history.length === 0 ? (
          <p className="text-sm text-gray-500">No pipeline runs yet.</p>
        ) : (
          <div className="relative space-y-0">
            <div className="absolute left-3 top-2 bottom-2 w-px bg-white/10" />
            {history.map((run) => {
              const version = `v${run.pipeline_run_number}`;
              const date = new Date(run.started_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              });
              const delta = run.comparison_result?.performanceDelta;
              const deltaText =
                delta === undefined
                  ? run.pipeline_run_number === 1
                    ? "baseline"
                    : "—"
                  : delta >= 0
                    ? `+${delta}% better`
                    : `${delta}% worse`;
              const statusLabel = run.was_promoted
                ? "promoted"
                : run.status === "awaiting_approval"
                  ? "awaiting approval"
                  : run.status === "failed"
                    ? "failed"
                    : "rejected";

              return (
                <div key={run.id} className="relative flex gap-4 pb-6 pl-8">
                  <span
                    className={`absolute left-1.5 top-1.5 h-3 w-3 rounded-full ${
                      run.was_promoted
                        ? "bg-emerald-500"
                        : run.status === "failed"
                          ? "bg-red-500"
                          : run.status === "awaiting_approval"
                            ? "bg-amber-500"
                            : "bg-gray-600"
                    }`}
                  />
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedRun(selectedRun?.id === run.id ? null : run)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        setSelectedRun(selectedRun?.id === run.id ? null : run);
                      }
                    }}
                    className="flex-1 cursor-pointer rounded-lg border border-white/5 bg-black/20 p-4 text-left hover:border-indigo-500/30"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-white">{version}</span>
                      <span className="text-gray-500">→</span>
                      <span className="text-sm text-gray-400">{date}</span>
                      <span className="text-gray-500">→</span>
                      <span className="text-sm text-gray-300">
                        {run.total_examples_used} examples
                      </span>
                      <span className="text-gray-500">→</span>
                      <span
                        className={`text-sm ${
                          run.was_promoted ? "text-emerald-400" : "text-gray-400"
                        }`}
                      >
                        {deltaText} → {statusLabel}
                      </span>
                    </div>
                    {run.status === "awaiting_approval" && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          approveRun(run.id);
                        }}
                        className="mt-2 rounded bg-emerald-600 px-3 py-1 text-xs text-white hover:bg-emerald-500"
                      >
                        Approve & Promote
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {selectedRun?.comparison_result && (
        <section className="mt-6 rounded-xl border border-white/10 bg-[#16161f] p-5">
          <h3 className="mb-3 text-sm font-medium text-gray-300">
            Comparison Report — v{selectedRun.pipeline_run_number}
          </h3>
          {selectedRun.comparison_result.verdict && (
            <p className="mb-2 text-white">{selectedRun.comparison_result.verdict}</p>
          )}
          {selectedRun.comparison_result.verdictDetail && (
            <p className="mb-4 text-sm text-gray-400">
              {selectedRun.comparison_result.verdictDetail}
            </p>
          )}
          {selectedRun.comparison_result.metrics && (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs text-gray-500">
                  <th className="py-2">Metric</th>
                  <th className="py-2">Previous</th>
                  <th className="py-2">New</th>
                </tr>
              </thead>
              <tbody>
                {selectedRun.comparison_result.metrics.map((m) => (
                  <tr key={m.metric} className="border-b border-white/5 text-gray-300">
                    <td className="py-2">{m.metric}</td>
                    <td className="py-2">{m.modelA}</td>
                    <td className="py-2">{m.modelB}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {selectedRun.comparison_result.rejectReason && !selectedRun.was_promoted && (
            <p className="mt-3 text-sm text-gray-500">
              {selectedRun.comparison_result.rejectReason}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
