"use client";

import { useState } from "react";
import type { LabComparisonResult, LabMetricRow } from "@/app/lib/modelLab";
import ComparisonPanel from "./ComparisonPanel";

type SuiteResultsProps = {
  metrics: LabMetricRow[];
  verdict: string;
  verdictDetail: string;
  overallWinner: "model_a" | "model_b" | "tie";
  fineTunedRecordId: string | null;
  onActivate: () => void;
  activating: boolean;
};

export function SuiteResults({
  metrics,
  verdict,
  verdictDetail,
  overallWinner,
  fineTunedRecordId,
  onActivate,
  activating,
}: SuiteResultsProps) {
  return (
    <div className="mt-8 space-y-6">
      <div
        className={`rounded-xl border p-6 text-center ${
          overallWinner === "model_b"
            ? "border-emerald-500/40 bg-emerald-500/10"
            : "border-white/10 bg-[#16161f]"
        }`}
      >
        <h3 className="text-2xl font-semibold text-white">{verdict}</h3>
        <p className="mt-2 text-sm text-gray-300">{verdictDetail}</p>
        {overallWinner === "model_b" && fineTunedRecordId && (
          <button
            type="button"
            disabled={activating}
            onClick={onActivate}
            className="mt-4 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {activating ? "Activating…" : "Activate My Model"}
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#16161f] p-5">
        <h3 className="mb-4 text-sm font-medium text-gray-300">Test Suite Results</h3>
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase text-gray-500">
              <th className="py-2 pr-4">Metric</th>
              <th className="py-2 pr-4">GPT-4o</th>
              <th className="py-2 pr-4">Your Model</th>
              <th className="py-2">Winner</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((row) => (
              <tr key={row.metric} className="border-b border-white/5 text-gray-300">
                <td className="py-2.5 pr-4">{row.metric}</td>
                <td className="py-2.5 pr-4">{row.modelA}</td>
                <td className="py-2.5 pr-4">{row.modelB}</td>
                <td className="py-2.5">
                  {row.winner === "model_b"
                    ? "Yours ✅"
                    : row.winner === "model_a"
                      ? "GPT-4o"
                      : "Tie"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SingleComparisonView({
  comparison,
}: {
  comparison: LabComparisonResult;
}) {
  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-2">
      <ComparisonPanel
        result={comparison.modelA}
        isWinner={comparison.winner === "model_a"}
      />
      <ComparisonPanel
        result={comparison.modelB}
        isWinner={comparison.winner === "model_b"}
      />
    </div>
  );
}

export function SuiteProgress({ current, total }: { current: number; total: number }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <div className="mt-4">
      <div className="mb-1 flex justify-between text-xs text-gray-400">
        <span>
          Running test suite ({current}/{total})
        </span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-indigo-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
