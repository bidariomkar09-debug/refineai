"use client";

import { useEffect, useState } from "react";
import { AI_MODELS } from "@/app/lib/settingsTypes";
import PageHeader from "@/app/components/shell/PageHeader";
import LoadingState from "@/app/components/shell/LoadingState";

function StarRating({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} className={i < value ? "text-indigo-400" : "text-gray-600"}>
          ★
        </span>
      ))}
    </div>
  );
}

export default function ModelsPage() {
  const [selectedModel, setSelectedModel] = useState("gpt-4o");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.settings?.selected_model) setSelectedModel(data.settings.selected_model);
      })
      .finally(() => setLoading(false));
  }, []);

  const selectModel = async (modelId: string) => {
    setSaving(modelId);
    setSaved(false);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selected_model: modelId }),
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedModel(data.settings.selected_model);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(null);
    }
  };

  if (loading) return <LoadingState />;

  return (
    <div className="overflow-x-hidden">
      <PageHeader
        title="AI Models"
        description="Choose the model that powers your builds."
        crumbs={[{ label: "RefineAI", href: "/dashboard" }, { label: "AI Models" }]}
      />

      {saved && (
        <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400">
          Model preference saved.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {AI_MODELS.map((model) => {
          const selected = selectedModel === model.id;
          return (
            <article
              key={model.id}
              className={`relative flex flex-col rounded-xl border p-6 transition ${
                selected
                  ? "border-indigo-500 bg-indigo-500/5 ring-1 ring-indigo-500/50"
                  : "border-white/10 bg-[#16161f] hover:border-indigo-500/30"
              }`}
            >
              {model.recommended && (
                <span className="absolute -top-2.5 right-4 rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-medium text-white">
                  Recommended
                </span>
              )}
              <h3 className="text-lg font-semibold text-white">{model.name}</h3>
              <p className="mt-1 font-mono text-xs text-gray-500">{model.id}</p>

              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Speed</span>
                  <StarRating value={model.speed} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Quality</span>
                  <StarRating value={model.quality} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Cost / 1k tokens</span>
                  <span className="text-white">${model.costPer1k}</span>
                </div>
              </div>

              <p className="mt-4 flex-1 text-sm text-gray-400">
                <span className="text-gray-500">Best for: </span>
                {model.bestFor}
              </p>

              <button
                type="button"
                disabled={saving === model.id}
                onClick={() => selectModel(model.id)}
                className={`mt-6 w-full rounded-lg py-2.5 text-sm font-medium transition ${
                  selected
                    ? "bg-indigo-600 text-white"
                    : "border border-white/10 text-white hover:border-indigo-500 hover:bg-indigo-500/10"
                } disabled:opacity-50`}
              >
                {selected ? "Selected" : saving === model.id ? "Saving..." : "Select"}
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}
