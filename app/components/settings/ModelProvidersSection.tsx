"use client";

import { useCallback, useEffect, useState } from "react";
import type { ModelProvider, ProviderCostStats } from "@/app/lib/settingsTypes";

type NewProviderForm = {
  provider_name: string;
  provider_type: "replicate" | "runpod" | "custom";
  endpoint_url: string;
  api_key: string;
  model_name: string;
  cost_per_1k_tokens: number;
};

const EMPTY_FORM: NewProviderForm = {
  provider_name: "Self-Hosted Llama (LoopModel-OSS v1)",
  provider_type: "custom",
  endpoint_url: "",
  api_key: "",
  model_name: "loopmodel-oss-v1",
  cost_per_1k_tokens: 0.002,
};

export default function ModelProvidersSection() {
  const [providers, setProviders] = useState<ModelProvider[]>([]);
  const [stats, setStats] = useState<ProviderCostStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewProviderForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [activatingId, setActivatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/model-providers");
      if (res.ok) {
        const data = await res.json();
        setProviders(data.providers ?? []);
        setStats(data.stats);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/model-providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setShowForm(false);
        setForm(EMPTY_FORM);
        await load();
      }
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    setTestResult(null);
    try {
      const res = await fetch(`/api/model-providers/${id}/test`, { method: "POST" });
      const data = await res.json();
      setTestResult(data.ok ? `✓ ${data.message} (${data.latencyMs}ms)` : `✗ ${data.message}`);
    } catch {
      setTestResult("✗ Connection test failed");
    } finally {
      setTestingId(null);
    }
  };

  const handleActivate = async (id: string) => {
    setActivatingId(id);
    try {
      await fetch(`/api/model-providers/${id}/activate`, { method: "POST" });
      await load();
    } catch {
      // silent
    } finally {
      setActivatingId(null);
    }
  };

  if (loading) {
    return (
      <section className="rounded-xl border border-white/10 bg-[#16161f] p-5">
        <p className="text-sm text-gray-500">Loading providers…</p>
      </section>
    );
  }

  const openaiProvider = providers.find((p) => p.provider_type === "openai");
  const selfHosted = providers.find((p) => p.provider_type !== "openai" && p.is_active);
  const openaiCost = stats?.openaiCostPer1k ?? openaiProvider?.cost_per_1k_tokens ?? 0.03;
  const selfCost = stats?.selfHostedCostPer1k ?? selfHosted?.cost_per_1k_tokens ?? 0.002;
  const savingsMultiplier =
    selfCost > 0 ? Math.round((openaiCost / selfCost) * 10) / 10 : 0;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-white/10 bg-[#16161f] p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-medium uppercase tracking-wide text-gray-400">
              Model Providers
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Route requests to OpenAI or your self-hosted endpoint with automatic fallback.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white hover:border-indigo-500"
          >
            {showForm ? "Cancel" : "+ Add Provider"}
          </button>
        </div>

        {showForm && (
          <div className="mb-6 space-y-3 rounded-lg border border-white/5 bg-black/20 p-4">
            <input
              type="text"
              value={form.provider_name}
              onChange={(e) => setForm((f) => ({ ...f, provider_name: e.target.value }))}
              placeholder="Provider name"
              className="w-full rounded-lg border border-white/10 bg-[#0f0f12] px-3 py-2 text-sm text-white"
            />
            <select
              value={form.provider_type}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  provider_type: e.target.value as NewProviderForm["provider_type"],
                }))
              }
              className="w-full rounded-lg border border-white/10 bg-[#0f0f12] px-3 py-2 text-sm text-white"
            >
              <option value="custom">Custom endpoint (OpenAI-compatible)</option>
              <option value="runpod">RunPod</option>
              <option value="replicate">Replicate</option>
            </select>
            <input
              type="url"
              value={form.endpoint_url}
              onChange={(e) => setForm((f) => ({ ...f, endpoint_url: e.target.value }))}
              placeholder="Endpoint URL"
              className="w-full rounded-lg border border-white/10 bg-[#0f0f12] px-3 py-2 text-sm text-white"
            />
            <input
              type="password"
              value={form.api_key}
              onChange={(e) => setForm((f) => ({ ...f, api_key: e.target.value }))}
              placeholder="API key"
              className="w-full rounded-lg border border-white/10 bg-[#0f0f12] px-3 py-2 text-sm text-white"
            />
            <input
              type="text"
              value={form.model_name}
              onChange={(e) => setForm((f) => ({ ...f, model_name: e.target.value }))}
              placeholder="Model name / Replicate version ID"
              className="w-full rounded-lg border border-white/10 bg-[#0f0f12] px-3 py-2 text-sm text-white"
            />
            <button
              type="button"
              disabled={saving}
              onClick={handleCreate}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Provider"}
            </button>
          </div>
        )}

        {testResult && (
          <p className="mb-4 text-sm text-gray-300">{testResult}</p>
        )}

        <ul className="space-y-3">
          {providers.map((p) => (
            <li
              key={p.id}
              className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 ${
                p.is_active
                  ? "border-emerald-500/40 bg-emerald-500/5"
                  : "border-white/5 bg-black/20"
              }`}
            >
              <div>
                <p className="font-medium text-white">
                  {p.provider_name}
                  {p.is_active && (
                    <span className="ml-2 text-xs text-emerald-400">(active)</span>
                  )}
                </p>
                <p className="text-xs text-gray-500">
                  {p.provider_type} · {p.model_name ?? "—"}
                  {p.cost_per_1k_tokens != null && ` · $${p.cost_per_1k_tokens}/1k tokens`}
                  {p.avg_latency_ms != null && ` · ~${p.avg_latency_ms}ms`}
                </p>
              </div>
              <div className="flex gap-2">
                {p.provider_type !== "openai" && (
                  <>
                    <button
                      type="button"
                      disabled={testingId === p.id}
                      onClick={() => handleTest(p.id)}
                      className="rounded border border-white/10 px-3 py-1 text-xs text-gray-300 hover:border-indigo-500 disabled:opacity-50"
                    >
                      {testingId === p.id ? "Testing…" : "Test"}
                    </button>
                    <button
                      type="button"
                      disabled={activatingId === p.id || p.is_active}
                      onClick={() => handleActivate(p.id)}
                      className="rounded bg-indigo-600 px-3 py-1 text-xs text-white hover:bg-indigo-500 disabled:opacity-50"
                    >
                      {activatingId === p.id ? "…" : p.is_active ? "Active" : "Activate"}
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>

        {selfHosted && savingsMultiplier > 1 && (
          <p className="mt-4 text-sm text-emerald-400">
            OpenAI: ${openaiCost}/1k tokens · Your model: ${selfCost}/1k tokens (
            {savingsMultiplier}x cheaper!)
          </p>
        )}
      </section>

      {stats && (
        <>
          <section className="rounded-xl border border-white/10 bg-[#16161f] p-5">
            <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-gray-400">
              Cost Savings — This Month
            </h2>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-gray-500">Requests via OpenAI</dt>
                <dd className="text-white">
                  {stats.openaiRequests} → ${stats.openaiCost.toFixed(2)}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Requests via Your Model</dt>
                <dd className="text-white">
                  {stats.selfHostedRequests} → ${stats.selfHostedCost.toFixed(2)}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Total saved</dt>
                <dd className="text-lg font-semibold text-emerald-400">
                  ${stats.totalSaved.toFixed(2)}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Projected annual savings</dt>
                <dd className="text-lg font-semibold text-emerald-400">
                  ${stats.projectedAnnualSavings.toFixed(2)}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-xl border border-white/10 bg-[#16161f] p-5">
            <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-gray-400">
              Latency & Quality Monitor
            </h2>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-gray-500">Avg response time — OpenAI</dt>
                <dd className="text-white">
                  {stats.openaiAvgLatencyMs > 0 ? `${stats.openaiAvgLatencyMs}ms` : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Avg response time — Your Model</dt>
                <dd className="text-white">
                  {stats.selfHostedAvgLatencyMs > 0 ? `${stats.selfHostedAvgLatencyMs}ms` : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Avg quality score — OpenAI</dt>
                <dd className="text-white">
                  {stats.openaiAvgScore > 0 ? `${stats.openaiAvgScore}%` : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Avg quality score — Your Model</dt>
                <dd className="text-white">
                  {stats.selfHostedAvgScore > 0 ? `${stats.selfHostedAvgScore}%` : "—"}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-gray-500">Self-hosted endpoint uptime</dt>
                <dd className="text-white">{stats.selfHostedUptimePercent}%</dd>
                <p className="mt-1 text-xs text-gray-500">
                  Auto-fallback to OpenAI on failure or &gt;10s timeout
                </p>
              </div>
            </dl>
          </section>
        </>
      )}
    </div>
  );
}
