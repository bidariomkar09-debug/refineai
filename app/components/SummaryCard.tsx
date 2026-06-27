"use client";

import type { DbFile, ProjectPlan } from "@/app/lib/agentTypes";

type SummaryCardProps = {
  plan: ProjectPlan;
  files: DbFile[];
  onDownload: () => void;
  onRunApp: () => void;
  isRunning: boolean;
  runDisabled: boolean;
};

export default function SummaryCard({
  plan,
  files,
  onDownload,
  onRunApp,
  isRunning,
  runDisabled,
}: SummaryCardProps) {
  const doneCount = files.filter((f) => f.status === "done").length;

  return (
    <div className="space-y-4 rounded-xl border border-accent-green/30 bg-accent-green/5 p-4 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-2xl">✅</span>
        <div>
          <h3 className="font-bold text-white">Your project is ready!</h3>
          <p className="text-xs text-gray-400">
            {doneCount} of {files.length} files complete
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onRunApp}
        disabled={runDisabled || isRunning}
        className="w-full rounded-xl bg-accent-green py-3 text-sm font-semibold text-white transition hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isRunning ? "Starting app..." : "Run App"}
      </button>

      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
          How to run
        </p>
        <p className="text-gray-300">
          {plan.setupInstructions ??
            "Click Run App above to preview your project live."}
        </p>
      </div>

      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
          How to deploy
        </p>
        <p className="text-gray-300">
          {plan.deployInstructions ??
            "Push to GitHub and import on Vercel. Add your environment variables in the Vercel dashboard."}
        </p>
      </div>

      <button
        type="button"
        onClick={onDownload}
        className="w-full rounded-xl border border-accent-green/40 bg-accent-green/10 py-2.5 text-sm font-medium text-accent-green transition hover:bg-accent-green/20"
      >
        Download All Files
      </button>
    </div>
  );
}
