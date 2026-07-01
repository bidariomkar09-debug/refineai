"use client";

import { useEffect, useState } from "react";
import { AI_MODELS } from "@/app/lib/settingsTypes";
import PageHeader from "@/app/components/shell/PageHeader";
import LoadingState from "@/app/components/shell/LoadingState";
import { useTheme } from "@/app/components/shell/ThemeProvider";
import ModelConfigSection from "@/app/components/settings/ModelConfigSection";
import ModelProvidersSection from "@/app/components/settings/ModelProvidersSection";

type SettingsForm = {
  account_name: string;
  selected_model: string;
  score_threshold: number;
  max_rounds: number;
  temperature: number;
  theme: "dark" | "light";
};

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [form, setForm] = useState<SettingsForm>({
    account_name: "Developer",
    selected_model: "gpt-4o",
    score_threshold: 95,
    max_rounds: 8,
    temperature: 0.7,
    theme: "dark",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [openaiStatus, setOpenaiStatus] = useState<"configured" | "missing" | "unknown">("unknown");
  const [apiKeyInput, setApiKeyInput] = useState("");

  useEffect(() => {
    Promise.all([fetch("/api/settings"), fetch("/api/health")])
      .then(async ([settingsRes, healthRes]) => {
        if (settingsRes.ok) {
          const data = await settingsRes.json();
          const s = data.settings;
          if (s) {
            setForm({
              account_name: s.account_name,
              selected_model: s.selected_model,
              score_threshold: s.score_threshold,
              max_rounds: s.max_rounds,
              temperature: s.temperature,
              theme: s.theme,
            });
            setTheme(s.theme);
          }
        }
        if (healthRes.ok) {
          const health = await healthRes.json();
          setOpenaiStatus(health.openai === "configured" ? "configured" : "missing");
        }
      })
      .finally(() => setLoading(false));
  }, [setTheme]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const data = await res.json();
        setForm({
          account_name: data.settings.account_name,
          selected_model: data.settings.selected_model,
          score_threshold: data.settings.score_threshold,
          max_rounds: data.settings.max_rounds,
          temperature: data.settings.temperature,
          theme: data.settings.theme,
        });
        setTheme(data.settings.theme);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setForm((f) => ({ ...f, theme: next }));
    setTheme(next);
  };

  if (loading) return <LoadingState />;

  return (
    <div className="max-w-2xl overflow-x-hidden pb-24 md:pb-0">
      <PageHeader
        title="Settings"
        description="Configure your RefineAI workspace."
        crumbs={[{ label: "RefineAI", href: "/dashboard" }, { label: "Settings" }]}
      />

      {saved && (
        <div className="mb-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400">
          Settings saved successfully.
        </div>
      )}

      <div className="space-y-6">
        <section className="rounded-xl border border-white/10 bg-[#16161f] p-5">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-gray-400">
            Account
          </h2>
          <label className="block text-sm text-gray-400">Display name</label>
          <input
            type="text"
            value={form.account_name}
            onChange={(e) => setForm((f) => ({ ...f, account_name: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-white/10 bg-[#0f0f12] px-4 py-2 text-white focus:border-indigo-500 focus:outline-none"
          />
        </section>

        <section className="rounded-xl border border-white/10 bg-[#16161f] p-5">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-gray-400">
            OpenAI API Key
          </h2>
          <div className="mb-3 flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                openaiStatus === "configured" ? "bg-emerald-500" : "bg-red-500"
              }`}
            />
            <span className="text-sm text-gray-300">
              {openaiStatus === "configured"
                ? "API key configured on server"
                : "API key not detected — add OPENAI_API_KEY to .env.local"}
            </span>
          </div>
          <input
            type="password"
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            placeholder="sk-••••••••••••••••"
            disabled
            className="w-full rounded-lg border border-white/10 bg-[#0f0f12] px-4 py-2 text-gray-500 focus:outline-none"
          />
          <p className="mt-2 text-xs text-gray-500">
            For security, API keys are set via environment variables and not stored in the database.
          </p>
        </section>

        <section className="rounded-xl border border-white/10 bg-[#16161f] p-5">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-gray-400">
            Build defaults
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400">Default model</label>
              <select
                value={form.selected_model}
                onChange={(e) => setForm((f) => ({ ...f, selected_model: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-white/10 bg-[#0f0f12] px-4 py-2 text-white focus:border-indigo-500 focus:outline-none"
              >
                {AI_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="flex justify-between text-sm text-gray-400">
                <span>Score threshold</span>
                <span className="text-white">{form.score_threshold}%</span>
              </label>
              <input
                type="range"
                min={90}
                max={99}
                value={form.score_threshold}
                onChange={(e) =>
                  setForm((f) => ({ ...f, score_threshold: Number(e.target.value) }))
                }
                className="mt-2 w-full accent-indigo-500"
              />
            </div>

            <div>
              <label className="flex justify-between text-sm text-gray-400">
                <span>Max refinement rounds</span>
                <span className="text-white">{form.max_rounds}</span>
              </label>
              <input
                type="range"
                min={3}
                max={20}
                value={form.max_rounds}
                onChange={(e) => setForm((f) => ({ ...f, max_rounds: Number(e.target.value) }))}
                className="mt-2 w-full accent-indigo-500"
              />
            </div>

            <div>
              <label className="flex justify-between text-sm text-gray-400">
                <span>Temperature</span>
                <span className="text-white">{form.temperature.toFixed(1)}</span>
              </label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={form.temperature}
                onChange={(e) =>
                  setForm((f) => ({ ...f, temperature: Number(e.target.value) }))
                }
                className="mt-2 w-full accent-indigo-500"
              />
            </div>
          </div>
        </section>

        <ModelConfigSection />

        <ModelProvidersSection />

        <section className="rounded-xl border border-white/10 bg-[#16161f] p-5">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-gray-400">
            Appearance
          </h2>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Theme</span>
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white hover:border-indigo-500"
            >
              {theme === "dark" ? "Dark mode" : "Light mode"} — tap to switch
            </button>
          </div>
        </section>

        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 w-full min-h-[44px] rounded-lg bg-indigo-600 py-3 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50 md:static sm:w-auto sm:px-8"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
