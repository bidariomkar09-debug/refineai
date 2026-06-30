import type { LabModelResult, LabRound } from "@/app/lib/modelLab";

type ComparisonPanelProps = {
  result: LabModelResult;
  isWinner: boolean;
};

function RoundBlock({ round, label }: { round: LabRound | null; label: string }) {
  if (!round) {
    return (
      <div className="rounded-lg border border-white/5 bg-black/20 p-3">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="mt-1 text-sm text-gray-600">—</p>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-white/5 bg-black/20 p-3">
      <div className="mb-1 flex justify-between text-xs text-gray-400">
        <span>{label}</span>
        <span className="text-indigo-400">{round.score}%</span>
      </div>
      <pre className="max-h-32 overflow-auto text-xs text-gray-300">
        {round.output.slice(0, 1200)}
        {round.output.length > 1200 ? "…" : ""}
      </pre>
    </div>
  );
}

export default function ComparisonPanel({ result, isWinner }: ComparisonPanelProps) {
  const timeSec = (result.timeMs / 1000).toFixed(1);

  return (
    <div
      className={`relative rounded-xl border p-4 ${
        isWinner
          ? "border-emerald-500/50 bg-emerald-500/5"
          : "border-white/10 bg-[#0f0f12]"
      }`}
    >
      {isWinner && (
        <span className="absolute -top-2 right-3 rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-semibold text-white">
          WINNER
        </span>
      )}
      <h3 className="mb-3 text-sm font-medium text-white">{result.label}</h3>
      <p className="mb-3 font-mono text-xs text-gray-500">{result.model}</p>

      {result.error && (
        <p className="mb-3 text-sm text-red-400">{result.error}</p>
      )}

      <div className="mb-3 space-y-2">
        <RoundBlock round={result.round1} label="Round 1" />
        <RoundBlock round={result.round2} label="Round 2" />
      </div>

      <dl className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <dt className="text-gray-500">Final score</dt>
          <dd className="text-white">{result.finalScore}%</dd>
        </div>
        <div>
          <dt className="text-gray-500">Rounds taken</dt>
          <dd className="text-white">{result.roundsTaken}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Tokens used</dt>
          <dd className="text-white">{result.totalTokens}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Time taken</dt>
          <dd className="text-white">{timeSec}s</dd>
        </div>
      </dl>
    </div>
  );
}
