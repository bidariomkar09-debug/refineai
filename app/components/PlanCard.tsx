"use client";

import type { ProjectPlan } from "@/app/lib/agentTypes";

type PlanCardProps = {
  plan: ProjectPlan;
};

export default function PlanCard({ plan }: PlanCardProps) {
  return (
    <div className="space-y-4 text-sm">
      <div>
        <h3 className="text-lg font-bold text-white">{plan.name}</h3>
        <p className="mt-1 text-gray-400">{plan.description}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-surface px-3 py-2">
          <span className="text-gray-500">Niche</span>
          <p className="font-medium capitalize text-white">{plan.niche}</p>
        </div>
        <div className="rounded-lg bg-surface px-3 py-2">
          <span className="text-gray-500">Files</span>
          <p className="font-medium text-white">{plan.estimatedFiles}</p>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
          Tech Stack
        </p>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(plan.techStack).map(([key, val]) => (
            <span
              key={key}
              className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs text-accent"
            >
              {val}
            </span>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
          Files to Build
        </p>
        <ul className="space-y-1">
          {plan.files.map((f) => (
            <li
              key={f.path}
              className="flex items-start gap-2 rounded-lg bg-surface/50 px-3 py-2 text-xs"
            >
              <span className="text-gray-500">⏳</span>
              <div>
                <span className="font-mono text-gray-300">{f.path}</span>
                <p className="text-gray-500">{f.purpose}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {plan.databaseSchema && plan.databaseSchema.trim() && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Database Schema
          </p>
          <pre className="max-h-32 overflow-auto rounded-lg bg-black/40 p-3 text-[10px] text-green-400">
            {plan.databaseSchema}
          </pre>
        </div>
      )}

      {plan.apiRoutes.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
            API Routes
          </p>
          <div className="flex flex-wrap gap-1.5">
            {plan.apiRoutes.map((route) => (
              <span
                key={route}
                className="rounded bg-surface px-2 py-0.5 font-mono text-xs text-gray-300"
              >
                {route}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
