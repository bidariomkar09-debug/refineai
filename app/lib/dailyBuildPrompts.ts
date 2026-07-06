export const DAILY_BUILD_PROMPTS = [
  "Build a personal habit tracker with daily streaks and dark mode",
  "Build a simple expense log with categories and monthly totals",
  "Build an AI notes app with quick capture and search",
  "Build a pomodoro timer combined with a todo list",
  "Build a mood journal with emoji pickers and weekly chart",
  "Build a personal dashboard for daily goals and progress",
  "Build a bookmark manager with tags and search",
  "Build a workout logger with sets, reps, and history",
  "Build a meal planner with a weekly calendar view",
  "Build a reading list tracker with progress bars",
  "Build a personal finance snapshot with income vs expenses",
  "Build a gratitude journal with one entry per day",
  "Build a focus app that blocks distractions and tracks sessions",
  "Build a personal landing page with hero, about, and contact sections",
] as const;

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function getTodaysBuildPrompt(date = new Date()): string {
  const start = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - start.getTime()) / 86_400_000);
  const index = dayOfYear % DAILY_BUILD_PROMPTS.length;
  return DAILY_BUILD_PROMPTS[index]!;
}

export function computeBuildStreak(
  projects: Array<{ status: string; created_at: string }>
): number {
  const completeDays = new Set(
    projects
      .filter((p) => p.status === "complete")
      .map((p) => localDateKey(new Date(p.created_at)))
  );

  if (completeDays.size === 0) return 0;

  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  while (true) {
    const key = localDateKey(cursor);
    if (!completeDays.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}
