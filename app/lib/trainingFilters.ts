import type { NextRequest } from "next/server";
import type { TrainingDataFilters } from "@/app/lib/settingsTypes";

export function parseTrainingFilters(request: NextRequest): TrainingDataFilters {
  const { searchParams } = request.nextUrl;
  const filters: TrainingDataFilters = {};

  if (searchParams.get("successful") === "true") {
    filters.successful = true;
  }
  const minScore = searchParams.get("minScore");
  if (minScore) {
    filters.minScore = Number(minScore);
  }
  const fileType = searchParams.get("fileType");
  if (fileType && fileType !== "all") {
    filters.fileType = fileType;
  }
  const from = searchParams.get("from");
  if (from) filters.from = from;
  const to = searchParams.get("to");
  if (to) filters.to = to;

  return filters;
}
