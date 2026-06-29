import type { TrainingDataSessionRow } from "@/app/lib/settingsTypes";

type TrainingTableProps = {
  sessions: TrainingDataSessionRow[];
};

function truncate(text: string, max = 48): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function TrainingTable({ sessions }: TrainingTableProps) {
  if (sessions.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-500">
        No training examples match your filters yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-gray-500">
            <th className="px-3 py-2 font-medium">Target</th>
            <th className="px-3 py-2 font-medium">File type</th>
            <th className="px-3 py-2 font-medium">Rounds</th>
            <th className="px-3 py-2 font-medium">Final score</th>
            <th className="px-3 py-2 font-medium">Successful</th>
            <th className="px-3 py-2 font-medium">Model</th>
            <th className="px-3 py-2 font-medium">Date</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((row) => (
            <tr
              key={row.session_id}
              className="border-b border-white/5 text-gray-300 hover:bg-white/5"
            >
              <td className="px-3 py-2.5" title={row.target}>
                {truncate(row.target)}
              </td>
              <td className="px-3 py-2.5">{row.file_type ?? "—"}</td>
              <td className="px-3 py-2.5">{row.rounds_taken}</td>
              <td className="px-3 py-2.5">{row.final_score}%</td>
              <td className="px-3 py-2.5">
                <span
                  className={
                    row.was_successful ? "text-emerald-400" : "text-gray-500"
                  }
                >
                  {row.was_successful ? "Yes" : "No"}
                </span>
              </td>
              <td className="px-3 py-2.5">{row.model_used}</td>
              <td className="px-3 py-2.5">{formatDate(row.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
