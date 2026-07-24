"use client";

import { useState } from "react";
import type { DbFile } from "@/app/lib/agentTypes";
import type { LoopEngineeringSnapshot } from "@/app/lib/loopEngineeringTypes";
import { formatElapsed } from "@/app/lib/loopEngineeringState";
import { formatBuildProof, twitterIntentUrl } from "@/app/lib/buildProof";
import { isFileTrulyComplete } from "@/app/lib/fileScoring";
import FileBadges from "./FileBadges";
import DogfoodNotes from "./DogfoodNotes";

type LoopEngineeringSummaryProps = {
  snapshot: LoopEngineeringSnapshot;
  onRunApp: () => void;
  onDownload: () => void;
  isRunDisabled: boolean;
  isPreviewRunning: boolean;
  setupInstructions?: string;
  deployInstructions?: string;
  originalPrompt: string;
  projectName: string;
  projectId: string;
  files: DbFile[];
  previewVerified: boolean;
  trainingExamplesAdded: number;
};

export default function LoopEngineeringSummary({
  snapshot,
  onRunApp,
  onDownload,
  isRunDisabled,
  isPreviewRunning,
  setupInstructions,
  deployInstructions,
  originalPrompt,
  projectName,
  projectId,
  files,
  previewVerified,
  trainingExamplesAdded,
}: LoopEngineeringSummaryProps) {
  const [copied, setCopied] = useState(false);

  const doneFiles = files.filter((f) => f.status === "done" || f.status === "needs_fix");
  const verifiedFiles = doneFiles.filter((f) => isFileTrulyComplete(f));
  const fileCount = doneFiles.length;
  const avgScore =
    verifiedFiles.length > 0
      ? Math.round(verifiedFiles.reduce((s, f) => s + f.score, 0) / verifiedFiles.length)
      : snapshot.goalQualityPercent;

  const proof =
    originalPrompt.trim() && snapshot.elapsedMs != null
      ? formatBuildProof({
          prompt: originalPrompt,
          projectName,
          elapsedMs: snapshot.elapsedMs,
          fileCount,
          avgScore,
          previewVerified,
        })
      : null;

  const handleCopyProof = async () => {
    if (!proof) return;
    try {
      await navigator.clipboard.writeText(proof.clipboardText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // clipboard unavailable
    }
  };

  const handleShareOnX = () => {
    if (!proof) return;
    window.open(twitterIntentUrl(proof.tweetText), "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className="space-y-4 rounded-xl border border-accent-green/30 bg-accent-green/5 p-5 motion-safe:animate-fade-in"
      data-testid="loop-engineering-summary"
    >
      <div>
        <h3 className="text-lg font-bold text-white">Loop Engineering Complete!</h3>
        <ul className="mt-3 space-y-1.5 text-sm text-gray-300">
          <li>
            Total loops run:{" "}
            <span className="font-semibold text-white">{snapshot.totalLoops}</span>
          </li>
          <li>
            Goal achieved:{" "}
            <span className="font-semibold text-accent-green">
              {snapshot.goalQualityPercent}% quality
            </span>
          </li>
          <li>
            Time taken:{" "}
            <span className="font-semibold text-white">
              {formatElapsed(snapshot.elapsedMs)}
            </span>
          </li>
          {trainingExamplesAdded > 0 && (
            <li className="text-indigo-300">
              +{trainingExamplesAdded} training example
              {trainingExamplesAdded === 1 ? "" : "s"} added from this build
            </li>
          )}
          <li className="text-accent-green">Agent drove every step</li>
        </ul>
      </div>

      {doneFiles.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Final file scores
          </p>
          <ul className="max-h-36 space-y-1 overflow-y-auto rounded-lg bg-black/20 p-2">
            {doneFiles
              .sort((a, b) => a.file_path.localeCompare(b.file_path))
              .map((file) => (
                <li
                  key={file.id}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <span className="min-w-0 truncate font-mono text-gray-300">
                    {file.file_path}
                  </span>
                  <FileBadges file={file} compact />
                </li>
              ))}
          </ul>
        </div>
      )}

      {setupInstructions && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
            How to run
          </p>
          <p className="text-sm text-gray-400">{setupInstructions}</p>
        </div>
      )}

      {deployInstructions && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
            How to deploy
          </p>
          <p className="text-sm text-gray-400">{deployInstructions}</p>
        </div>
      )}

      {proof && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={handleCopyProof}
            className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-medium text-white transition hover:border-indigo-500"
            data-testid="copy-proof-button"
          >
            {copied ? "Copied!" : "Copy proof"}
          </button>
          <button
            type="button"
            onClick={handleShareOnX}
            className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-medium text-white transition hover:border-indigo-500"
            data-testid="share-on-x-button"
          >
            Share on X
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={onRunApp}
        disabled={isRunDisabled || isPreviewRunning}
        className="w-full rounded-xl bg-accent-green py-3 text-sm font-semibold text-white transition hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50"
        data-testid="run-app-button"
      >
        {isPreviewRunning ? "Starting app..." : "Run App"}
      </button>
      <p className="text-center text-[11px] text-gray-500">
        Opens the Preview tab and runs your app in-browser
      </p>

      <button
        type="button"
        onClick={onDownload}
        className="w-full rounded-xl border border-accent-green/40 bg-accent-green/10 py-2.5 text-sm font-medium text-accent-green transition hover:bg-accent-green/20"
      >
        Download All Files
      </button>

      <DogfoodNotes projectId={projectId} prompt={originalPrompt} />
    </div>
  );
}
