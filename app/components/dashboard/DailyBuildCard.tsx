"use client";

import { useRouter } from "next/navigation";
import { computeBuildStreak, getTodaysBuildPrompt } from "@/app/lib/dailyBuildPrompts";

type DailyBuildCardProps = {
  projects: Array<{ status: string; created_at: string }>;
};

export default function DailyBuildCard({ projects }: DailyBuildCardProps) {
  const router = useRouter();
  const prompt = getTodaysBuildPrompt();
  const streak = computeBuildStreak(projects);

  const handleBuild = () => {
    const params = new URLSearchParams({ new: "1", idea: prompt });
    router.push(`/workspace?${params.toString()}`);
  };

  return (
    <section className="mb-6 rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium uppercase tracking-wide text-indigo-300">
            Today&apos;s build
          </h2>
          {streak > 0 && (
            <p className="mt-1 text-xs text-gray-500">
              {streak}-day streak — keep compounding
            </p>
          )}
        </div>
        <span className="shrink-0 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-xs text-indigo-300">
          Daily dogfood
        </span>
      </div>
      <p className="text-sm leading-relaxed text-gray-200">{prompt}</p>
      <button
        type="button"
        onClick={handleBuild}
        className="mt-4 w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500 sm:w-auto sm:px-6"
      >
        Build this
      </button>
    </section>
  );
}
