"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  LoopModelApiKey,
  LoopModelDashboard,
  LoopModelDeveloper,
} from "@/app/lib/settingsTypes";
import PageHeader from "@/app/components/shell/PageHeader";
import LoadingState from "@/app/components/shell/LoadingState";

export default function LoopModelApiPage() {
  const [dashboard, setDashboard] = useState<LoopModelDashboard | null>(null);
  const [keys, setKeys] = useState<LoopModelApiKey[]>([]);
  const [developers, setDevelopers] = useState<LoopModelDeveloper[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [devName, setDevName] = useState("");
  const [devEmail, setDevEmail] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/loopmodel");
      if (res.ok) {
        const data = await res.json();
        setDashboard(data.dashboard);
        setKeys(data.keys ?? []);
        setDevelopers(data.developers ?? []);
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

  const createKey = async (external = false) => {
    setCreating(true);
    setNewKey(null);
    try {
      const res = await fetch("/api/loopmodel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_key",
          name: external ? "External developer" : "RefineAI internal",
          ...(external && devName ? { name: devName, email: devEmail, plan: "pro" } : {}),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewKey(data.key);
        await load();
      }
    } catch {
      // silent
    } finally {
      setCreating(false);
    }
  };

  const revokeKey = async (keyId: string) => {
    try {
      await fetch("/api/loopmodel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke_key", keyId }),
      });
      await load();
    } catch {
      // silent
    }
  };

  if (loading) return <LoadingState />;

  const d = dashboard;

  return (
    <div className="overflow-x-hidden pb-24">
      <PageHeader
        title="LoopModel API"
        description="Infrastructure for developers — RefineAI is the product, LoopModel is the API."
        crumbs={[
          { label: "RefineAI", href: "/dashboard" },
          { label: "LoopModel API" },
        ]}
      />

      <div className="mb-8 rounded-xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/10 to-purple-500/5 p-6">
        <p className="text-lg font-medium text-white">
          RefineAI is like ChatGPT · LoopModel API is like the GPT API
        </p>
        <p className="mt-2 text-sm text-gray-300">
          Revenue from RefineAI subscribers <em>and</em> every developer who builds on LoopModel.
        </p>
      </div>

      {d && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="API requests (month)" value={d.totalRequests} />
          <StatCard label="External developers" value={d.externalDevelopers} />
          <StatCard
            label="API infrastructure revenue"
            value={`$${d.apiInfrastructureRevenue.toFixed(2)}`}
            accent
          />
          <StatCard
            label="RefineAI subscriber revenue"
            value={`$${d.refineaiSubscriberRevenue.toFixed(2)}`}
          />
          <StatCard
            label="Total revenue (month)"
            value={`$${d.revenueThisMonth.toFixed(2)}`}
            className="sm:col-span-2"
          />
          <StatCard
            label="Projected annual API revenue"
            value={`$${d.projectedAnnualApiRevenue.toFixed(2)}`}
            className="sm:col-span-2"
          />
        </div>
      )}

      <section className="mb-8 rounded-xl border border-white/10 bg-[#16161f] p-5">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-gray-400">
          API Reference
        </h2>
        <div className="space-y-4 font-mono text-sm">
          <div className="rounded-lg bg-black/30 p-4">
            <p className="text-gray-500">POST /api/v1/loop/refine</p>
            <p className="mt-1 text-xs text-gray-400">
              Async — returns immediately with a job_id. Poll for completion.
            </p>
            <pre className="mt-2 overflow-x-auto text-xs text-gray-300">{`Authorization: Bearer lm_live_…

{
  "target": "Build a React todo component",
  "file_path": "components/Todo.tsx",
  "model": "loop-v5"
}

→ 202 { "job_id": "…", "poll_url": "/api/jobs/…", "status": "queued" }`}</pre>
          </div>
          <div className="rounded-lg bg-black/30 p-4">
            <p className="text-gray-500">GET /api/jobs/:id</p>
            <p className="mt-1 text-xs text-gray-400">
              Poll until status is completed or failed. Result includes output, score, and rounds.
            </p>
          </div>
          <div className="rounded-lg bg-black/30 p-4">
            <p className="text-gray-500">Rate limits (sliding window)</p>
            <p className="mt-1 text-xs text-gray-400">
              Free: 10/min · Pro: 60/min · Enterprise: unlimited. Returns 429 with Retry-After when exceeded.
            </p>
          </div>
          <div className="rounded-lg bg-black/30 p-4">
            <p className="text-gray-500">GET /api/v1/models</p>
            <p className="mt-1 text-xs text-gray-400">List available LoopModel versions</p>
          </div>
        </div>
      </section>

      <section className="mb-8 rounded-xl border border-white/10 bg-[#16161f] p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-gray-400">
            API Keys
          </h2>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={creating}
              onClick={() => createKey(false)}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {creating ? "Creating…" : "Create Key"}
            </button>
          </div>
        </div>

        {newKey && (
          <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
            <p className="text-xs text-emerald-300">New API key (copy now):</p>
            <code className="mt-1 block break-all text-sm text-white">{newKey}</code>
          </div>
        )}

        <ul className="space-y-2">
          {keys.length === 0 ? (
            <li className="text-sm text-gray-500">No API keys yet.</li>
          ) : (
            keys.map((k) => (
              <li
                key={k.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/5 bg-black/20 px-4 py-3"
              >
                <div>
                  <p className="text-sm text-white">{k.name}</p>
                  <p className="font-mono text-xs text-gray-500">{k.key_prefix}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs ${k.is_active ? "text-emerald-400" : "text-gray-500"}`}
                  >
                    {k.is_active ? "active" : "revoked"}
                  </span>
                  {k.is_active && (
                    <button
                      type="button"
                      onClick={() => revokeKey(k.id)}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="rounded-xl border border-white/10 bg-[#16161f] p-5">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-gray-400">
          Register External Developer
        </h2>
        <p className="mb-4 text-sm text-gray-400">
          Developers building on LoopModel get their own API key and usage billing.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <input
            type="text"
            placeholder="Company / developer name"
            value={devName}
            onChange={(e) => setDevName(e.target.value)}
            className="rounded-lg border border-white/10 bg-[#0f0f12] px-3 py-2 text-sm text-white"
          />
          <input
            type="email"
            placeholder="Email"
            value={devEmail}
            onChange={(e) => setDevEmail(e.target.value)}
            className="rounded-lg border border-white/10 bg-[#0f0f12] px-3 py-2 text-sm text-white"
          />
          <button
            type="button"
            disabled={creating || !devName}
            onClick={() => createKey(true)}
            className="rounded-lg border border-indigo-500/50 px-4 py-2 text-sm text-indigo-300 hover:bg-indigo-500/10 disabled:opacity-50"
          >
            Issue Developer Key
          </button>
        </div>
        {developers.length > 1 && (
          <p className="mt-4 text-xs text-gray-500">
            {developers.length - 1} external developer{developers.length > 2 ? "s" : ""} registered
          </p>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
  className = "",
}: {
  label: string;
  value: string | number;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        accent ? "border-emerald-500/30 bg-emerald-500/5" : "border-white/10 bg-[#16161f]"
      } ${className}`}
    >
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${accent ? "text-emerald-400" : "text-white"}`}>
        {value}
      </p>
    </div>
  );
}
