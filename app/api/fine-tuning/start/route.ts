import { NextRequest, NextResponse } from "next/server";
import {
  getLatestFineTunedModel,
  syncFineTunedJobStatus,
  updateFineTunedModel,
} from "@/app/lib/db";
import {
  createFineTuningJob,
  formatOpenAIError,
  mapOpenAIJobStatus,
} from "@/app/lib/fineTuning";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const recordId = typeof body.recordId === "string" ? body.recordId : undefined;

    let record = await getLatestFineTunedModel();
    if (!record) {
      return NextResponse.json({ error: "No fine-tune record found", record: null }, { status: 404 });
    }
    if (recordId && record.id !== recordId) {
      return NextResponse.json({ error: "Record not found", record: null }, { status: 404 });
    }

    if (!record.openai_file_id) {
      return NextResponse.json(
        { error: "Upload dataset before starting fine-tuning", record },
        { status: 400 }
      );
    }

    if (record.job_id && ["queued", "running"].includes(record.status)) {
      return NextResponse.json({ record });
    }

    try {
      const { jobId, status } = await createFineTuningJob(record.openai_file_id);
      const updated = await updateFineTunedModel(record.id, {
        job_id: jobId,
        status: mapOpenAIJobStatus(status),
      });
      return NextResponse.json({ record: updated });
    } catch (err) {
      const message = formatOpenAIError(err);
      const failed = await syncFineTunedJobStatus(record.id, "failed", null, message);
      return NextResponse.json({ error: message, record: failed }, { status: 502 });
    }
  } catch (err) {
    return NextResponse.json(
      { error: formatOpenAIError(err), record: null },
      { status: 500 }
    );
  }
}
