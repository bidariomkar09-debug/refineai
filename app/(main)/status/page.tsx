"use client";

import { useEffect, useState } from "react";
import type { StatusPageData } from "@/app/lib/settingsTypes";
import PageHeader from "@/app/components/shell/PageHeader";

export default function StatusPage() {
  const [data, setData] = useState<StatusPageData | null>(null);
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  const subscribe = async () => {
    try {
      const res = await fetch("/api/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) setSubscribed(true);
    } catch {
      // silent
    }
  };

  const statusColor =
    data?.overall === "operational"
      ? "text-emerald-400"
      : data?.overall === "degraded"
        ? "text-amber-400"
        : "text-red-400";

  return (
    <div className="mx-auto max-w-2xl pb-24">
      <PageHeader
        title="System Status"
        description="RefineAI and LoopModel API health."
        crumbs={[{ label: "RefineAI", href: "/dashboard" }, { label: "Status" }]}
      />

      <div className="mb-8 rounded-xl border border-white/10 bg-[#16161f] p-6 text-center">
        <p className={`text-2xl font-semibold capitalize ${statusColor}`}>
          {data?.overall ?? "operational"}
        </p>
        <p className="mt-2 text-sm text-gray-400">All systems monitored continuously</p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <UptimeCard label="90-day uptime" value={`${data?.uptime90Days ?? 99.9}%`} />
        <UptimeCard label="LoopModel API" value={`${data?.apiUptime ?? 99.9}%`} />
        <UptimeCard label="Provider routing" value={`${data?.loopApiUptime ?? 99.9}%`} />
      </div>

      <section className="mb-8 rounded-xl border border-white/10 bg-[#16161f] p-5">
        <h2 className="mb-4 text-sm font-medium uppercase text-gray-400">Incident history</h2>
        {(data?.incidents ?? []).length === 0 ? (
          <p className="text-sm text-gray-500">No incidents in the last 90 days.</p>
        ) : (
          <ul className="space-y-3">
            {data?.incidents.map((inc) => (
              <li key={inc.id} className="border-b border-white/5 pb-3 last:border-0">
                <p className="text-sm text-white">{inc.title}</p>
                <p className="text-xs text-gray-500">
                  {new Date(inc.started_at).toLocaleDateString()} · {inc.status} ·{" "}
                  {inc.impact ?? "minor"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-white/10 bg-[#16161f] p-5">
        <h2 className="mb-3 text-sm font-medium text-gray-300">Subscribe to updates</h2>
        {subscribed ? (
          <p className="text-sm text-emerald-400">You&apos;re subscribed for incident notifications.</p>
        ) : (
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="flex-1 rounded-lg border border-white/10 bg-[#0f0f12] px-3 py-2 text-sm text-white"
            />
            <button
              type="button"
              onClick={subscribe}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500"
            >
              Subscribe
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function UptimeCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#16161f] p-4 text-center">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}
