import type { TrainingDataStats } from "@/app/lib/settingsTypes";

type TrainingReadinessProps = {
  stats: TrainingDataStats;
};

function ProgressBar({
  label,
  current,
  target,
}: {
  label: string;
  current: number;
  target: number;
}) {
  const percent = Math.min(100, Math.round((current / target) * 100));
  return (
    <div className="mb-4">
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-gray-400">{label}</span>
        <span className="text-white">
          {current} / {target}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-indigo-500 transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

const MILESTONES = [
  { key: "bronze" as const, label: "Bronze", threshold: 100, emoji: "🥉" },
  { key: "silver" as const, label: "Silver", threshold: 500, emoji: "🥈" },
  { key: "gold" as const, label: "Gold", threshold: 1000, emoji: "🥇" },
  { key: "diamond" as const, label: "Diamond", threshold: 5000, emoji: "💎" },
];

export default function TrainingReadiness({ stats }: TrainingReadinessProps) {
  const statusMessage =
    stats.totalExamples >= 1000
      ? "Ready to fine-tune your model!"
      : "Keep building projects to collect more training data!";

  return (
    <section className="mb-8 rounded-xl border border-white/10 bg-[#16161f] p-5">
      <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-gray-400">
        Model Training Readiness
      </h2>

      <ProgressBar label="Examples collected" current={stats.totalExamples} target={1000} />
      <ProgressBar label="Quality examples (95%+)" current={stats.qualityExamples} target={800} />
      <ProgressBar label="File types covered" current={stats.uniqueFileTypes} target={20} />

      <div className="mb-4">
        <div className="mb-1 flex justify-between text-sm">
          <span className="text-gray-400">Overall readiness</span>
          <span className="text-white">{stats.readinessPercent}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${stats.readinessPercent}%` }}
          />
        </div>
      </div>

      <p className="mb-4 text-sm text-gray-300">{statusMessage}</p>

      <div className="flex flex-wrap gap-2">
        {MILESTONES.map((m) => {
          const earned = stats.milestones[m.key];
          return (
            <span
              key={m.key}
              className={`rounded-lg border px-3 py-1.5 text-xs ${
                earned
                  ? "border-indigo-500/50 bg-indigo-500/10 text-indigo-300"
                  : "border-white/10 bg-white/5 text-gray-500"
              }`}
              title={`${m.threshold}+ examples`}
            >
              {m.emoji} {m.label}
              {earned ? "" : " (locked)"}
            </span>
          );
        })}
      </div>
    </section>
  );
}
