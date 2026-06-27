"use client";

import type { LoopStats } from "@/app/lib/types";

type DeveloperStatsProps = {
  stats: LoopStats | null;
};

export default function DeveloperStats({ stats }: DeveloperStatsProps) {
  if (!stats) return null;

  return (
    <div className="rounded-lg border border-surface-border bg-surface p-3">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
        Session Stats
      </h3>
      <dl className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <dt className="text-gray-500">Rounds</dt>
          <dd className="font-bold text-white">{stats.totalRounds}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Tokens</dt>
          <dd className="font-bold text-white">{stats.totalTokens.toLocaleString()}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Avg score Δ</dt>
          <dd className="font-bold text-white">+{stats.avgScoreDelta}%</dd>
        </div>
        <div>
          <dt className="text-gray-500">Time</dt>
          <dd className="font-bold text-white">{stats.timeTakenSec}s</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-gray-500">Model</dt>
          <dd className="font-bold text-accent">{stats.model}</dd>
        </div>
      </dl>
    </div>
  );
}
