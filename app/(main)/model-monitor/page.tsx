"use client";

import { useCallback, useEffect, useState } from "react";
import type { ModelMonitorStats, RolloutSuggestion } from "@/app/lib/settingsTypes";
import PageHeader from "@/app/components/shell/PageHeader";
import LoadingState from "@/app/components/shell/LoadingState";

export default function ModelMonitorPage() {
  const [stats, setStats] = useState<ModelMonitorStats | null>(null);
  const [rollout, setRollout] = useState<RolloutSuggestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [rollingBack, setRollingBack] = useState(false);
  const [rolloutAction, setRolloutAction] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/model-monitor");
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setRollout(data.rollout);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, [load]);

  const handleRollback = async () => {
    if (!confirm("Emergency rollback will disable your custom model for all users. Continue?")) {
      return;
    }
    setRollingBack(true);
    try {
      await fetch("/api/model-config/rollback", { method: "POST" });
      await load();
    } catch {
      // silent
    } finally {
      setRollingBack(false);
    }
  };

  const handleRolloutAction = async (action: "accept" | "dismiss") => {
    if (!rollout) return;
    setRolloutAction(true);
    try {
      await fetch("/api/model-config/rollout-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          suggestedPercentage: rollout.suggestedPercentage,
        }),
      });
      setRollout((r) => (r ? { ...r, show: false } : r));
      await load();
    } catch {
      // silent
    } finally {
      setRolloutAction(false);
    }
  };

  if (loading) return <LoadingState />;

  const s = stats ?? {
    gpt4oRequests: 0,
    customModelRequests: 0,
    customSuccessRate: 0,
    customAvgScore: 0,
    gpt4oAvgScore: 0,
    fallbackTriggers: 0,
    underperforming: false,
    customModelId: null,
    rolloutPercentage: 0,
    isCustomEnabled: false,
  };

  return (
    <div className="overflow-x-hidden pb-24">
      <PageHeader
        title="Model Monitor"
        description="Live comparison of GPT-4o vs your fine-tuned model (last 24 hours)."
        crumbs={[
          { label: "RefineAI", href: "/dashboard" },
          { label: "Model Monitor" },
        ]}
      />

      {s.underperforming && (
        <div className="mb-6 rounded-xl border border-amber-500/40 bg-amber-500/10 px-5 py-4 text-sm text-amber-200">
          ⚠️ Your model is underperforming. Consider reducing rollout percentage.
          <span className="mt-1 block text-amber-300/80">
            Success rate: {s.customSuccessRate}% (threshold: 85%)
          </span>
        </div>
      )}

      {rollout?.show && (
        <div className="mb-6 rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-5 py-4">
          <p className="text-sm text-indigo-100">{rollout.message}</p>
          <div className="mt-3 flex gap-3">
            <button
              type="button"
              disabled={rolloutAction}
              onClick={() => handleRolloutAction("accept")}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              Yes
            </button>
            <button
              type="button"
              disabled={rolloutAction}
              onClick={() => handleRolloutAction("dismiss")}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm text-gray-300 hover:border-white/20 disabled:opacity-50"
            >
              Not yet
            </button>
          </div>
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Requests — GPT-4o" value={s.gpt4oRequests} />
        <StatCard label="Requests — Your Model" value={s.customModelRequests} />
        <StatCard label="Your Model Success Rate" value={`${s.customSuccessRate}%`} />
        <StatCard label="Your Model Avg Score" value={`${s.customAvgScore}%`} />
        <StatCard label="GPT-4o Avg Score" value={`${s.gpt4oAvgScore}%`} />
        <StatCard label="Fallback Triggers (errors)" value={s.fallbackTriggers} highlight={s.fallbackTriggers > 0} />
      </div>

      <div className="mb-6 rounded-xl border border-white/10 bg-[#16161f] p-5">
        <h3 className="mb-3 text-sm font-medium text-gray-300">Current Rollout</h3>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-gray-500">Custom model enabled</dt>
            <dd className="text-white">{s.isCustomEnabled ? "Yes" : "No"}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Rollout percentage</dt>
            <dd className="text-white">{s.rolloutPercentage}%</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-gray-500">Custom model ID</dt>
            <dd className="font-mono text-xs text-gray-300">{s.customModelId ?? "—"}</dd>
          </div>
        </dl>
      </div>

      <button
        type="button"
        disabled={rollingBack}
        onClick={handleRollback}
        className="w-full rounded-xl border-2 border-red-500/60 bg-red-500/10 px-6 py-4 text-base font-semibold text-red-400 transition hover:bg-red-500/20 disabled:opacity-50 sm:w-auto"
      >
        {rollingBack ? "Rolling back…" : "Emergency Rollback"}
      </button>
      <p className="mt-2 text-xs text-gray-500">
        Instantly disables custom model and sets rollout to 0%. All traffic reverts to GPT-4o.
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        highlight
          ? "border-amber-500/30 bg-amber-500/5"
          : "border-white/10 bg-[#16161f]"
      }`}
    >
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}
