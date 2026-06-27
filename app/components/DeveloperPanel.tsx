"use client";

import { useEffect, useState } from "react";
import type { DeveloperConfig } from "@/app/lib/developerConfig";
import {
  DEV_PANEL_COLLAPSED_KEY,
  MODEL_OPTIONS,
} from "@/app/lib/developerConfig";
import type { ApiCallSnapshot, Iteration, LoopStats } from "@/app/lib/types";
import ApiPlayground from "./ApiPlayground";
import DeveloperStats from "./DeveloperStats";

type DeveloperPanelProps = {
  config: DeveloperConfig;
  onConfigChange: (partial: Partial<DeveloperConfig>) => void;
  iterations: Iteration[];
  loopStats: LoopStats | null;
  lastApiCall: ApiCallSnapshot | null;
  onExport: () => void;
  disabled: boolean;
};

export default function DeveloperPanel({
  config,
  onConfigChange,
  iterations,
  loopStats,
  lastApiCall,
  onExport,
  disabled,
}: DeveloperPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(DEV_PANEL_COLLAPSED_KEY) === "true");
    } catch {
      // ignore
    }
  }, []);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(DEV_PANEL_COLLAPSED_KEY, String(next));
  };

  if (collapsed) {
    return (
      <aside className="hidden w-10 shrink-0 border-l border-surface-border bg-surface-raised md:flex md:flex-col">
        <button
          type="button"
          onClick={toggleCollapsed}
          className="flex h-full flex-col items-center justify-center gap-2 py-4 text-gray-400 hover:text-white"
          title="Expand Developer Panel"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-[10px] font-medium [writing-mode:vertical-lr]">DEV</span>
        </button>
      </aside>
    );
  }

  return (
    <>
      {/* Mobile overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/60 md:hidden"
        onClick={toggleCollapsed}
        aria-hidden="true"
      />

      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-surface-border bg-surface-raised md:static md:z-auto md:w-80 md:shrink-0">
        <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
          <h2 className="text-sm font-semibold text-white">Developer Panel</h2>
          <button
            type="button"
            onClick={toggleCollapsed}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-surface-border hover:text-white"
            aria-label="Collapse panel"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {/* System Prompt */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">
              System Prompt
            </label>
            <textarea
              value={config.systemPrompt}
              onChange={(e) => onConfigChange({ systemPrompt: e.target.value })}
              disabled={disabled}
              rows={5}
              className="w-full resize-none rounded-lg border border-surface-border bg-surface px-3 py-2 text-xs text-gray-200 outline-none focus:border-accent disabled:opacity-50"
            />
          </div>

          {/* Model */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">
              Model
            </label>
            <select
              value={config.model}
              onChange={(e) =>
                onConfigChange({
                  model: e.target.value as DeveloperConfig["model"],
                })
              }
              disabled={disabled}
              className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-xs text-gray-200 outline-none focus:border-accent disabled:opacity-50"
            >
              {MODEL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} — {opt.hint}
                </option>
              ))}
            </select>
          </div>

          {/* Score Threshold */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-medium text-gray-400">
                Score Threshold
              </label>
              <span className="text-xs font-bold text-accent">
                {config.scoreThreshold}%
              </span>
            </div>
            <input
              type="range"
              min={50}
              max={99}
              value={config.scoreThreshold}
              onChange={(e) =>
                onConfigChange({ scoreThreshold: Number(e.target.value) })
              }
              disabled={disabled}
              className="w-full accent-accent"
            />
          </div>

          {/* Max Rounds */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">
              Max Rounds
            </label>
            <input
              type="number"
              min={3}
              max={20}
              value={config.maxRounds}
              onChange={(e) =>
                onConfigChange({
                  maxRounds: Math.min(20, Math.max(3, Number(e.target.value))),
                })
              }
              disabled={disabled}
              className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-xs text-gray-200 outline-none focus:border-accent disabled:opacity-50"
            />
          </div>

          {/* Temperature */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-medium text-gray-400">
                Temperature
              </label>
              <span className="text-xs font-bold text-accent">
                {config.temperature.toFixed(1)}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={10}
              value={config.temperature * 10}
              onChange={(e) =>
                onConfigChange({ temperature: Number(e.target.value) / 10 })
              }
              disabled={disabled}
              className="w-full accent-accent"
            />
            <div className="mt-1 flex justify-between text-[10px] text-gray-500">
              <span>Focused (0)</span>
              <span>Creative (1)</span>
            </div>
          </div>

          {/* JSON Mode */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-300">JSON Output Mode</p>
              <p className="text-[10px] text-gray-500">Structured JSON in output cards</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={config.jsonMode}
              onClick={() => onConfigChange({ jsonMode: !config.jsonMode })}
              disabled={disabled}
              className={`relative h-6 w-11 rounded-full transition ${
                config.jsonMode ? "bg-accent" : "bg-gray-600"
              } disabled:opacity-50`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
                  config.jsonMode ? "left-5" : "left-0.5"
                }`}
              />
            </button>
          </div>

          {/* Export */}
          <button
            type="button"
            onClick={onExport}
            disabled={iterations.length === 0}
            className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-xs font-medium text-gray-300 transition hover:border-accent hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Export Session JSON
          </button>

          <DeveloperStats stats={loopStats} />

          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
              API Playground
            </h3>
            <ApiPlayground apiCall={lastApiCall} />
          </div>
        </div>
      </aside>
    </>
  );
}
