"use client";

import { useEffect, useState } from "react";
import type { ModelConfig, ModelConfigStats } from "@/app/lib/settingsTypes";

type ModelConfigSectionProps = {
  onSaved?: () => void;
};

export default function ModelConfigSection({ onSaved }: ModelConfigSectionProps) {
  const [config, setConfig] = useState<Partial<ModelConfig>>({
    is_custom_model_enabled: false,
    custom_model_id: "",
    rollout_percentage: 0,
  });
  const [stats, setStats] = useState<ModelConfigStats>({
    customHandled: 0,
    totalRecent: 0,
    successfulCustom: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/model-config")
      .then((r) => r.json())
      .then((data) => {
        if (data.config) {
          setConfig({
            is_custom_model_enabled: data.config.is_custom_model_enabled,
            custom_model_id: data.config.custom_model_id ?? "",
            rollout_percentage: data.config.rollout_percentage ?? 0,
          });
        }
        if (data.stats) setStats(data.stats);
        if (data.suggestedModelId && !data.config?.custom_model_id) {
          setConfig((c) => ({ ...c, custom_model_id: data.suggestedModelId }));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/model-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_custom_model_enabled: config.is_custom_model_enabled,
          custom_model_id: config.custom_model_id,
          rollout_percentage: config.rollout_percentage,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setConfig({
            is_custom_model_enabled: data.config.is_custom_model_enabled,
            custom_model_id: data.config.custom_model_id ?? "",
            rollout_percentage: data.config.rollout_percentage ?? 0,
          });
        }
        if (data.stats) setStats(data.stats);
        setSaved(true);
        onSaved?.();
        setTimeout(() => setSaved(false), 2500);
      }
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="rounded-xl border border-white/10 bg-[#16161f] p-5">
        <p className="text-sm text-gray-500">Loading model configuration…</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-white/10 bg-[#16161f] p-5">
      <h2 className="mb-1 text-sm font-medium uppercase tracking-wide text-gray-400">
        AI Model Configuration
      </h2>
      <p className="mb-4 text-xs text-gray-500">
        Control production rollout of your fine-tuned model with gradual traffic splitting.
      </p>

      {saved && (
        <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
          Model configuration saved.
        </div>
      )}

      <div className="space-y-4">
        <label className="flex cursor-pointer items-center justify-between">
          <span className="text-sm text-gray-300">Enable Custom Model</span>
          <button
            type="button"
            role="switch"
            aria-checked={config.is_custom_model_enabled}
            onClick={() =>
              setConfig((c) => ({
                ...c,
                is_custom_model_enabled: !c.is_custom_model_enabled,
              }))
            }
            className={`relative h-6 w-11 rounded-full transition ${
              config.is_custom_model_enabled ? "bg-indigo-600" : "bg-white/10"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition ${
                config.is_custom_model_enabled ? "translate-x-5" : ""
              }`}
            />
          </button>
        </label>

        <div>
          <label className="block text-sm text-gray-400">Custom Model ID</label>
          <input
            type="text"
            value={config.custom_model_id ?? ""}
            onChange={(e) => setConfig((c) => ({ ...c, custom_model_id: e.target.value }))}
            placeholder="ft:gpt-4o:refineai:loop-v1"
            className="mt-1 w-full rounded-lg border border-white/10 bg-[#0f0f12] px-4 py-2 font-mono text-sm text-white focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="flex justify-between text-sm text-gray-400">
            <span>Rollout Percentage</span>
            <span className="text-white">{config.rollout_percentage ?? 0}%</span>
          </label>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={config.rollout_percentage ?? 0}
            onChange={(e) =>
              setConfig((c) => ({ ...c, rollout_percentage: Number(e.target.value) }))
            }
            className="mt-2 w-full accent-indigo-500"
          />
          <div className="mt-1 flex justify-between text-xs text-gray-600">
            <span>0% (GPT-4o only)</span>
            <span>100% (Custom only)</span>
          </div>
        </div>

        <div className="rounded-lg border border-white/5 bg-black/20 px-4 py-3 text-sm text-gray-300">
          Your model handled{" "}
          <span className="font-medium text-white">{stats.successfulCustom}</span> of last{" "}
          <span className="font-medium text-white">{stats.totalRecent || 100}</span> requests
          successfully
          {stats.customHandled > 0 && (
            <span className="text-gray-500">
              {" "}
              ({stats.customHandled} routed to custom model)
            </span>
          )}
        </div>

        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Model Configuration"}
        </button>
      </div>
    </section>
  );
}
