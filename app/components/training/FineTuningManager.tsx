"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FineTunedModel, FineTuningJobStatus, ModelComparisonResult } from "@/app/lib/settingsTypes";

type FineTuningManagerProps = {
  canUpload: boolean;
  trainingSetCount: number;
};

const POLL_INTERVAL_MS = 30_000;

const DEFAULT_TEST_PROMPT =
  "Build a React TypeScript button component with loading state, disabled state, and accessible aria labels.";

export default function FineTuningManager({ canUpload, trainingSetCount }: FineTuningManagerProps) {
  const [record, setRecord] = useState<FineTunedModel | null>(null);
  const [jobStatus, setJobStatus] = useState<FineTuningJobStatus | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [starting, setStarting] = useState(false);
  const [activating, setActivating] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testPrompt, setTestPrompt] = useState(DEFAULT_TEST_PROMPT);
  const [comparison, setComparison] = useState<ModelComparisonResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadRecord = useCallback(async () => {
    try {
      const res = await fetch("/api/fine-tuning");
      if (res.ok) {
        const data = await res.json();
        setRecord(data.record ?? null);
      }
    } catch {
      // silent
    }
  }, []);

  const pollStatus = useCallback(async () => {
    if (!record?.id) return;
    try {
      const res = await fetch("/api/fine-tuning/poll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordId: record.id }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.record) setRecord(data.record);
        if (data.jobStatus) setJobStatus(data.jobStatus);
      }
    } catch {
      // silent
    }
  }, [record?.id]);

  useEffect(() => {
    loadRecord();
  }, [loadRecord]);

  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    const active = record?.status === "queued" || record?.status === "running";
    if (active && record?.job_id) {
      pollStatus();
      pollRef.current = setInterval(pollStatus, POLL_INTERVAL_MS);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [record?.status, record?.job_id, pollStatus]);

  const uploadFromCleaned = async () => {
    setUploading(true);
    setUploadProgress(10);
    setError(null);
    try {
      setUploadProgress(40);
      const res = await fetch("/api/fine-tuning/upload", { method: "POST" });
      setUploadProgress(80);
      const data = await res.json();
      if (data.record) setRecord(data.record);
      if (data.error) setError(data.error);
      setUploadProgress(100);
    } catch {
      setError("Upload failed");
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1500);
    }
  };

  const uploadFromFile = async (file: File) => {
    setUploading(true);
    setUploadProgress(20);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      setUploadProgress(50);
      const res = await fetch("/api/fine-tuning/upload", { method: "POST", body: form });
      setUploadProgress(90);
      const data = await res.json();
      if (data.record) setRecord(data.record);
      if (data.error) setError(data.error);
      setUploadProgress(100);
    } catch {
      setError("Upload failed");
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1500);
    }
  };

  const startFineTuning = async () => {
    if (!record?.id) return;
    setStarting(true);
    setError(null);
    try {
      const res = await fetch("/api/fine-tuning/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordId: record.id }),
      });
      const data = await res.json();
      if (data.record) setRecord(data.record);
      if (data.error) setError(data.error);
    } catch {
      setError("Failed to start fine-tuning");
    } finally {
      setStarting(false);
    }
  };

  const activateModel = async () => {
    if (!record?.id) return;
    setActivating(true);
    setError(null);
    try {
      const res = await fetch("/api/fine-tuning/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordId: record.id }),
      });
      const data = await res.json();
      if (data.record) setRecord(data.record);
      if (data.error) setError(data.error);
    } catch {
      setError("Activation failed");
    } finally {
      setActivating(false);
    }
  };

  const runComparison = async () => {
    setComparing(true);
    setError(null);
    setComparison(null);
    try {
      const res = await fetch("/api/fine-tuning/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: testPrompt }),
      });
      const data = await res.json();
      if (data.result) setComparison(data.result);
      if (data.error) setError(data.error);
    } catch {
      setError("Comparison failed");
    } finally {
      setComparing(false);
    }
  };

  const canStart =
    !!record?.openai_file_id &&
    record.status === "uploaded" &&
    !record.job_id;
  const isTraining = record?.status === "queued" || record?.status === "running";
  const succeeded = record?.status === "succeeded" && !!record.model_id;

  return (
    <section className="mb-6 rounded-xl border border-white/10 bg-[#16161f] p-5">
      <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-gray-400">
        Train Your Model
      </h2>

      {error && (
        <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={uploading || !canUpload}
          onClick={uploadFromCleaned}
          className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white hover:border-indigo-500 disabled:opacity-50"
        >
          {uploading ? "Uploading…" : "Upload Dataset (Cleaned)"}
        </button>
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white hover:border-indigo-500 disabled:opacity-50"
        >
          Upload JSONL File
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".jsonl,application/jsonl"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void uploadFromFile(file);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={!canStart || starting || isTraining}
          onClick={startFineTuning}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {starting ? "Starting…" : "Start Fine Tuning"}
        </button>
      </div>

      {!canUpload && (
        <p className="mt-3 text-xs text-gray-500">
          Clean your dataset first ({trainingSetCount} training examples available).
        </p>
      )}

      {uploading && uploadProgress > 0 && (
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs text-gray-400">
            <span>Upload progress</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {record && (
        <div className="mt-5 space-y-3 rounded-lg border border-white/10 bg-[#0f0f12] p-4 text-sm">
          <div className="flex flex-wrap gap-4">
            <StatusItem label="Status" value={record.status} />
            <StatusItem label="File ID" value={record.openai_file_id ?? "—"} />
            <StatusItem label="Job ID" value={record.job_id ?? "—"} />
            <StatusItem label="Examples" value={record.training_examples_used} />
          </div>

          {isTraining && jobStatus && (
            <div>
              <div className="mb-1 flex justify-between text-xs text-gray-400">
                <span>Training progress</span>
                <span>{jobStatus.progressPercent ?? 0}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${jobStatus.progressPercent ?? 10}%` }}
                />
              </div>
              {jobStatus.estimatedFinish && (
                <p className="mt-2 text-xs text-gray-500">
                  Est. finish: {new Date(jobStatus.estimatedFinish).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {succeeded && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
              <p className="text-emerald-300">Training complete!</p>
              <p className="mt-1 font-mono text-xs text-gray-300">{record.model_id}</p>
              <button
                type="button"
                disabled={activating || record.activated}
                onClick={activateModel}
                className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                {record.activated
                  ? "Model Activated"
                  : activating
                    ? "Activating…"
                    : "Activate This Model"}
              </button>
            </div>
          )}
        </div>
      )}

      {succeeded && (
        <div className="mt-6 border-t border-white/10 pt-5">
          <h3 className="mb-3 text-sm font-medium text-gray-300">Model Comparison</h3>
          <textarea
            value={testPrompt}
            onChange={(e) => setTestPrompt(e.target.value)}
            rows={3}
            className="mb-3 w-full rounded-lg border border-white/10 bg-[#0f0f12] px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
          />
          <button
            type="button"
            disabled={comparing}
            onClick={runComparison}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white hover:border-indigo-500 disabled:opacity-50"
          >
            {comparing ? "Running comparison…" : "Run Comparison"}
          </button>

          {comparison && (
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <ComparisonCard
                title={`Base (${comparison.baseModel})`}
                output={comparison.baseOutput}
                score={comparison.baseScore}
                rounds={comparison.baseRounds}
                isWinner={comparison.winner === "base"}
                roundsWinner={comparison.roundsWinner === "base"}
              />
              <ComparisonCard
                title={`Fine-tuned (${comparison.fineTunedModel})`}
                output={comparison.fineTunedOutput}
                score={comparison.fineTunedScore}
                rounds={comparison.fineTunedRounds}
                isWinner={comparison.winner === "fine_tuned"}
                roundsWinner={comparison.roundsWinner === "fine_tuned"}
              />
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function StatusItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-gray-200">{value}</p>
    </div>
  );
}

function ComparisonCard({
  title,
  output,
  score,
  rounds,
  isWinner,
  roundsWinner,
}: {
  title: string;
  output: string;
  score: number;
  rounds: number;
  isWinner: boolean;
  roundsWinner: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        isWinner ? "border-emerald-500/40 bg-emerald-500/5" : "border-white/10 bg-[#0f0f12]"
      }`}
    >
      <h4 className="mb-2 text-sm font-medium text-white">{title}</h4>
      <p className="text-xs text-gray-400">
        Score: {score}% {isWinner && <span className="text-emerald-400">(higher)</span>}
      </p>
      <p className="text-xs text-gray-400">
        Est. rounds: {rounds}{" "}
        {roundsWinner && <span className="text-emerald-400">(fewer)</span>}
      </p>
      <pre className="mt-3 max-h-48 overflow-auto rounded bg-black/40 p-2 text-xs text-gray-300">
        {output.slice(0, 2000)}
        {output.length > 2000 ? "…" : ""}
      </pre>
    </div>
  );
}
