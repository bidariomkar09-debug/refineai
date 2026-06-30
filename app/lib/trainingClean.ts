import type { CleaningSummary, TrainingDataCleanRow, TrainingDataRow } from "./settingsTypes";

export type CleaningPipelineResult = {
  rows: TrainingDataCleanRow[];
  summary: CleaningSummary;
};

function sessionKey(row: TrainingDataRow): string {
  return row.session_id ?? row.project_id ?? row.id;
}

function isNonEmpty(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function pickCanonicalRow(group: TrainingDataRow[]): TrainingDataRow {
  const withCritiqueAndFinal = group.filter(
    (r) => isNonEmpty(r.critique) && isNonEmpty(r.final_output)
  );
  if (withCritiqueAndFinal.length > 0) {
    return withCritiqueAndFinal.sort((a, b) => b.round_number - a.round_number)[0];
  }
  return [...group].sort((a, b) => b.round_number - a.round_number)[0];
}

function collapseToSessions(rows: TrainingDataRow[]): TrainingDataRow[] {
  const groups = new Map<string, TrainingDataRow[]>();
  for (const row of rows) {
    const key = sessionKey(row);
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }
  return Array.from(groups.values()).map(pickCanonicalRow);
}

function passesFilter(row: TrainingDataRow): boolean {
  return row.reached_threshold === true && row.rounds_to_complete >= 2;
}

function passesValidation(row: TrainingDataRow): boolean {
  return (
    isNonEmpty(row.target) &&
    isNonEmpty(row.critique) &&
    isNonEmpty(row.final_output) &&
    row.score_after >= 95
  );
}

function dedupeByTarget(rows: TrainingDataRow[]): TrainingDataRow[] {
  const byTarget = new Map<string, TrainingDataRow>();
  for (const row of rows) {
    const key = row.target.trim();
    const existing = byTarget.get(key);
    if (!existing) {
      byTarget.set(key, row);
      continue;
    }
    if (row.score_after > existing.score_after) {
      byTarget.set(key, row);
      continue;
    }
    if (
      row.score_after === existing.score_after &&
      new Date(row.created_at).getTime() > new Date(existing.created_at).getTime()
    ) {
      byTarget.set(key, row);
    }
  }
  return Array.from(byTarget.values());
}

function normalizeFileType(fileType: string | null): string {
  return fileType?.trim() || "other";
}

function normalizeProjectType(projectType: string | null): string {
  return projectType?.trim() || "general";
}

function balanceDataset(rows: TrainingDataRow[]): TrainingDataRow[] {
  const byFileType = new Map<string, TrainingDataRow[]>();
  for (const row of rows) {
    const ft = normalizeFileType(row.file_type);
    const list = byFileType.get(ft) ?? [];
    list.push(row);
    byFileType.set(ft, list);
  }

  const balanced: TrainingDataRow[] = [];

  for (const [, bucket] of Array.from(byFileType.entries())) {
    const byProject = new Map<string, TrainingDataRow[]>();
    for (const row of bucket) {
      const pt = normalizeProjectType(row.project_type);
      const list = byProject.get(pt) ?? [];
      list.push(row);
      byProject.set(pt, list);
    }

    const projectQueues = Array.from(byProject.values()).map((q) =>
      [...q].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    );

    const selected: TrainingDataRow[] = [];
    let added = true;
    while (selected.length < 100 && added) {
      added = false;
      for (const queue of projectQueues) {
        if (selected.length >= 100) break;
        const next = queue.shift();
        if (next) {
          selected.push(next);
          added = true;
        }
      }
    }

    balanced.push(...selected);
  }

  return balanced;
}

function seededShuffle<T>(items: T[], seed: number): T[] {
  const arr = [...items];
  let s = seed;
  const random = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function toCleanRow(row: TrainingDataRow, split: "train" | "test", cleanedAt: string): TrainingDataCleanRow {
  return {
    source_id: row.id,
    session_id: row.session_id,
    project_id: row.project_id,
    target: row.target.trim(),
    input_context: row.input_context,
    output: row.output,
    critique: row.critique!.trim(),
    final_output: row.final_output!.trim(),
    score_after: row.score_after,
    rounds_to_complete: row.rounds_to_complete,
    model_used: row.model_used,
    file_type: row.file_type,
    project_type: row.project_type,
    task_type: row.task_type,
    split,
    cleaned_at: cleanedAt,
  };
}

function buildSummary(
  totalRaw: number,
  cleaned: TrainingDataCleanRow[],
  cleanedAt: string
): CleaningSummary {
  const trainingSet = cleaned.filter((r) => r.split === "train").length;
  const testSet = cleaned.filter((r) => r.split === "test").length;
  return {
    totalRaw,
    afterCleaning: cleaned.length,
    trainingSet,
    testSet,
    readyForFineTuning: trainingSet >= 100,
    cleanedAt,
  };
}

export const EMPTY_CLEANING_SUMMARY: CleaningSummary = {
  totalRaw: 0,
  afterCleaning: 0,
  trainingSet: 0,
  testSet: 0,
  readyForFineTuning: false,
  cleanedAt: null,
};

export function runCleaningPipeline(rows: TrainingDataRow[]): CleaningPipelineResult {
  try {
    const totalRaw = rows.length;
    const cleanedAt = new Date().toISOString();
    const seed = cleanedAt.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);

    const collapsed = collapseToSessions(rows);
    const filtered = collapsed.filter(passesFilter);
    const validated = filtered.filter(passesValidation);
    const deduped = dedupeByTarget(validated);
    const balanced = balanceDataset(deduped);
    const shuffled = seededShuffle(balanced, seed);

    if (shuffled.length === 0) {
      return { rows: [], summary: { ...EMPTY_CLEANING_SUMMARY, totalRaw, cleanedAt } };
    }

    const trainCount = Math.max(1, Math.floor(shuffled.length * 0.9));
    const cleanRows: TrainingDataCleanRow[] = shuffled.map((row, index) =>
      toCleanRow(row, index < trainCount ? "train" : "test", cleanedAt)
    );

    return {
      rows: cleanRows,
      summary: buildSummary(totalRaw, cleanRows, cleanedAt),
    };
  } catch {
    return { rows: [], summary: EMPTY_CLEANING_SUMMARY };
  }
}

export function cleanRowToTrainingDataRow(row: TrainingDataCleanRow): TrainingDataRow {
  return {
    id: row.source_id ?? row.id ?? "",
    session_id: row.session_id,
    project_id: row.project_id,
    target: row.target,
    round_number: row.rounds_to_complete,
    input_context: row.input_context,
    output: row.output,
    critique: row.critique,
    score_before: 0,
    score_after: row.score_after,
    score_improvement: 0,
    improvement_summary: null,
    final_output: row.final_output,
    was_successful: true,
    reached_threshold: true,
    rounds_to_complete: row.rounds_to_complete,
    model_used: row.model_used ?? "gpt-4o",
    temperature: 0.7,
    tokens_used: 0,
    project_type: row.project_type,
    file_type: row.file_type,
    task_type: row.task_type,
    created_at: row.cleaned_at,
  };
}
