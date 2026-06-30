import type { CleaningSummary } from "@/app/lib/settingsTypes";

type CleaningSummaryProps = {
  summary: CleaningSummary;
  cleaning: boolean;
  exporting: boolean;
  onClean: () => void;
  onExport: () => void;
};

export default function CleaningSummaryPanel({
  summary,
  cleaning,
  exporting,
  onClean,
  onExport,
}: CleaningSummaryProps) {
  const hasCleaned = summary.cleanedAt !== null;

  return (
    <section className="mb-6 rounded-xl border border-white/10 bg-[#16161f] p-5">
      <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-gray-400">
        Dataset Preparation
      </h2>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={cleaning}
          onClick={onClean}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {cleaning ? "Cleaning…" : "Clean & Prepare Dataset"}
        </button>
        <button
          type="button"
          disabled={summary.trainingSet === 0 || exporting}
          onClick={onExport}
          className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white hover:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {exporting ? "Exporting…" : "Export Clean JSONL (Training Set)"}
        </button>
      </div>

      {hasCleaned && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <SummaryItem label="Total raw examples" value={summary.totalRaw} />
          <SummaryItem label="After cleaning" value={summary.afterCleaning} />
          <SummaryItem label="Training set" value={summary.trainingSet} />
          <SummaryItem label="Test set" value={summary.testSet} />
          <SummaryItem
            label="Ready for fine tuning"
            value={summary.readyForFineTuning ? "Yes" : "No"}
            highlight={summary.readyForFineTuning}
          />
        </div>
      )}

      {!hasCleaned && (
        <p className="mt-4 text-sm text-gray-500">
          Run cleaning to filter, balance, validate, and split your data for fine-tuning.
        </p>
      )}
    </section>
  );
}

function SummaryItem({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#0f0f12] px-4 py-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${highlight ? "text-emerald-400" : "text-white"}`}>
        {value}
      </p>
    </div>
  );
}
