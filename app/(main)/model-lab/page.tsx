"use client";

import { useCallback, useEffect, useState } from "react";
import type { LabComparisonResult, LabMetricRow } from "@/app/lib/modelLab";
import PageHeader from "@/app/components/shell/PageHeader";
import EmptyState from "@/app/components/shell/EmptyState";
import {
  SingleComparisonView,
  SuiteProgress,
  SuiteResults,
} from "@/app/components/model-lab/SuiteResults";

const DEFAULT_PROMPT =
  "Build a React TypeScript todo list component with add, toggle complete, and delete functionality.";

export default function ModelLabPage() {
  const [target, setTarget] = useState(DEFAULT_PROMPT);
  const [running, setRunning] = useState(false);
  const [runningSuite, setRunningSuite] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comparison, setComparison] = useState<LabComparisonResult | null>(null);
  const [metrics, setMetrics] = useState<LabMetricRow[]>([]);
  const [verdict, setVerdict] = useState<string | null>(null);
  const [verdictDetail, setVerdictDetail] = useState<string | null>(null);
  const [overallWinner, setOverallWinner] = useState<"model_a" | "model_b" | "tie" | null>(
    null
  );
  const [fineTunedRecordId, setFineTunedRecordId] = useState<string | null>(null);
  const [hasFineTuned, setHasFineTuned] = useState(false);
  const [activating, setActivating] = useState(false);
  const [suiteProgress, setSuiteProgress] = useState(0);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/model-lab");
      if (res.ok) {
        const data = await res.json();
        setHasFineTuned(!!data.fineTunedModelId);
        setFineTunedRecordId(data.fineTunedRecordId ?? null);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const runComparison = async () => {
    setRunning(true);
    setError(null);
    setComparison(null);
    setMetrics([]);
    setVerdict(null);
    try {
      const res = await fetch("/api/model-lab/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target }),
      });
      const data = await res.json();
      if (data.comparison) setComparison(data.comparison);
      if (data.fineTunedRecordId) setFineTunedRecordId(data.fineTunedRecordId);
      if (data.error) setError(data.error);
    } catch {
      setError("Comparison failed");
    } finally {
      setRunning(false);
    }
  };

  const runTestSuite = async () => {
    setRunningSuite(true);
    setError(null);
    setComparison(null);
    setSuiteProgress(0);
    setMetrics([]);
    setVerdict(null);

    const progressTimer = setInterval(() => {
      setSuiteProgress((p) => Math.min(p + 1, 19));
    }, 8000);

    try {
      const res = await fetch("/api/model-lab/suite", { method: "POST" });
      const data = await res.json();
      if (data.metrics) setMetrics(data.metrics);
      if (data.verdict) setVerdict(data.verdict);
      if (data.verdictDetail) setVerdictDetail(data.verdictDetail);
      if (data.overallWinner) setOverallWinner(data.overallWinner);
      if (data.fineTunedRecordId) setFineTunedRecordId(data.fineTunedRecordId);
      if (data.error) setError(data.error);
      setSuiteProgress(20);
    } catch {
      setError("Test suite failed");
    } finally {
      clearInterval(progressTimer);
      setRunningSuite(false);
    }
  };

  const activateModel = async () => {
    if (!fineTunedRecordId) return;
    setActivating(true);
    try {
      await fetch("/api/fine-tuning/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordId: fineTunedRecordId }),
      });
    } catch {
      // silent
    } finally {
      setActivating(false);
    }
  };

  if (!hasFineTuned && !running && !runningSuite) {
    return (
      <div>
        <PageHeader
          title="Model Lab"
          description="A/B test your fine-tuned model against GPT-4o."
          crumbs={[
            { label: "RefineAI", href: "/dashboard" },
            { label: "Model Lab" },
          ]}
        />
        <EmptyState
          title="No fine-tuned model yet"
          description="Complete fine-tuning on the Training Data page before running lab tests."
        />
      </div>
    );
  }

  return (
    <div className="overflow-x-hidden">
      <PageHeader
        title="Model Lab"
        description="A/B test your fine-tuned model against GPT-4o with single prompts or the 20-test suite."
        crumbs={[
          { label: "RefineAI", href: "/dashboard" },
          { label: "Model Lab" },
        ]}
      />

      <section className="mb-6 rounded-xl border border-white/10 bg-[#16161f] p-5">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-gray-400">
          Test Prompt
        </h2>
        <textarea
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          rows={4}
          className="mb-4 w-full rounded-lg border border-white/10 bg-[#0f0f12] px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
          placeholder="Enter a test target…"
        />
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={running || runningSuite || !target.trim()}
            onClick={runComparison}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {running ? "Running comparison…" : "Run Comparison"}
          </button>
          <button
            type="button"
            disabled={running || runningSuite}
            onClick={runTestSuite}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white hover:border-indigo-500 disabled:opacity-50"
          >
            {runningSuite ? "Running test suite…" : "Run Test Suite (20 prompts)"}
          </button>
        </div>
        {runningSuite && <SuiteProgress current={suiteProgress} total={20} />}
        {error && (
          <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}
      </section>

      {comparison && <SingleComparisonView comparison={comparison} />}

      {metrics.length > 0 && verdict && verdictDetail && overallWinner && (
        <SuiteResults
          metrics={metrics}
          verdict={verdict}
          verdictDetail={verdictDetail}
          overallWinner={overallWinner}
          fineTunedRecordId={fineTunedRecordId}
          onActivate={activateModel}
          activating={activating}
        />
      )}
    </div>
  );
}
