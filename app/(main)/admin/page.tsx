"use client";

import { useEffect, useState } from "react";
import type { AdminMetrics } from "@/app/lib/settingsTypes";
import PageHeader from "@/app/components/shell/PageHeader";
import LoadingState from "@/app/components/shell/LoadingState";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function AdminPage() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/metrics")
      .then((r) => r.json())
      .then(setMetrics)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;

  const m = metrics ?? {
    mrr: 0,
    mrrTrend: [],
    churnRate: 0,
    newSignupsThisWeek: 0,
    activeUsersDaily: 0,
    activeUsersWeekly: 0,
    activeUsersMonthly: 0,
    topApiCustomers: [],
    supportTicketsThisWeek: 0,
  };

  return (
    <div className="overflow-x-hidden pb-24">
      <PageHeader
        title="Admin Metrics"
        description="Internal dashboard — MRR, growth, and API usage."
        crumbs={[{ label: "RefineAI", href: "/dashboard" }, { label: "Admin" }]}
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="MRR" value={`$${m.mrr.toFixed(2)}`} accent />
        <Stat label="Churn rate (month)" value={`${m.churnRate}%`} />
        <Stat label="New signups (week)" value={m.newSignupsThisWeek} />
        <Stat label="Support escalations (week)" value={m.supportTicketsThisWeek} />
      </div>

      <section className="mb-8 rounded-xl border border-white/10 bg-[#16161f] p-5">
        <h2 className="mb-4 text-sm font-medium uppercase text-gray-400">MRR trend</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={m.mrrTrend}>
              <CartesianGrid stroke="#333" strokeDasharray="3 3" />
              <XAxis dataKey="month" stroke="#888" fontSize={12} />
              <YAxis stroke="#888" fontSize={12} />
              <Tooltip
                contentStyle={{ background: "#16161f", border: "1px solid #333" }}
              />
              <Line type="monotone" dataKey="mrr" stroke="#6366f1" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Stat label="DAU" value={m.activeUsersDaily} />
        <Stat label="WAU" value={m.activeUsersWeekly} />
        <Stat label="MAU" value={m.activeUsersMonthly} />
      </div>

      <section className="rounded-xl border border-white/10 bg-[#16161f] p-5">
        <h2 className="mb-4 text-sm font-medium uppercase text-gray-400">
          Top API customers by usage
        </h2>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs text-gray-500">
              <th className="py-2">Customer</th>
              <th className="py-2">Requests</th>
              <th className="py-2">Tokens</th>
            </tr>
          </thead>
          <tbody>
            {m.topApiCustomers.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-4 text-gray-500">
                  No API usage yet
                </td>
              </tr>
            ) : (
              m.topApiCustomers.map((c) => (
                <tr key={c.name} className="border-b border-white/5 text-gray-300">
                  <td className="py-2">{c.name}</td>
                  <td className="py-2">{c.requests}</td>
                  <td className="py-2">{c.tokens.toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        accent ? "border-emerald-500/30 bg-emerald-500/5" : "border-white/10 bg-[#16161f]"
      }`}
    >
      <p className="text-xs uppercase text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${accent ? "text-emerald-400" : "text-white"}`}>
        {value}
      </p>
    </div>
  );
}
