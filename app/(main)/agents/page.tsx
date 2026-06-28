"use client";

import Link from "next/link";
import PageHeader from "@/app/components/shell/PageHeader";

export default function AgentsPage() {
  return (
    <div>
      <PageHeader
        title="Parallel Agents"
        description="Run multiple RefineAI agents in parallel — coming soon."
        crumbs={[
          { label: "RefineAI", href: "/dashboard" },
          { label: "Parallel Agents" },
        ]}
      />
      <div className="rounded-xl border border-dashed border-white/10 bg-[#16161f]/50 px-6 py-16 text-center">
        <p className="text-4xl text-indigo-500/40">∞∞</p>
        <h2 className="mt-4 text-lg font-medium text-white">Coming soon</h2>
        <p className="mt-2 text-sm text-gray-400">
          Build multiple features at once with parallel AI agents working on separate tasks.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block text-sm text-indigo-400 hover:text-indigo-300"
        >
          ← Back to home
        </Link>
      </div>
    </div>
  );
}
