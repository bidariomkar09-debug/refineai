import { NextRequest, NextResponse } from "next/server";
import {
  getLatestFineTunedModel,
  syncFineTunedJobStatus,
} from "@/app/lib/db";
import { fetchFineTuningJobStatus, formatOpenAIError } from "@/app/lib/fineTuning";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const recordId = typeof body.recordId === "string" ? body.recordId : undefined;

    const record = await getLatestFineTunedModel();
    if (!record || (recordId && record.id !== recordId)) {
      return NextResponse.json({ status: null, record: null });
    }

    if (!record.job_id) {
      return NextResponse.json({ status: null, record });
    }

    try {
      const jobStatus = await fetchFineTuningJobStatus(record.job_id);
      const updated = await syncFineTunedJobStatus(
        record.id,
        jobStatus.status,
        jobStatus.modelId,
        jobStatus.errorMessage
      );

      return NextResponse.json({
        record: updated,
        jobStatus,
      });
    } catch (err) {
      return NextResponse.json({
        record,
        jobStatus: null,
        error: formatOpenAIError(err),
      });
    }
  } catch {
    return NextResponse.json({ status: null, record: null });
  }
}
