import { NextRequest, NextResponse } from "next/server";
import {
  createFineTunedModelRecord,
  getTrainingDataClean,
  updateFineTunedModel,
} from "@/app/lib/db";
import { cleanRowToTrainingDataRow } from "@/app/lib/trainingClean";
import { formatOpenAIError, uploadFineTuningFile } from "@/app/lib/fineTuning";
import { toOpenAIJSONL } from "@/app/lib/trainingExport";

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    let jsonlContent: string;
    let trainingExamplesUsed = 0;

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (!file || !(file instanceof File)) {
        return NextResponse.json({ error: "JSONL file required", record: null }, { status: 400 });
      }
      jsonlContent = await file.text();
      trainingExamplesUsed = jsonlContent.trim().split("\n").filter(Boolean).length;
    } else {
      const trainRows = await getTrainingDataClean("train");
      if (trainRows.length === 0) {
        return NextResponse.json(
          { error: "No cleaned training data. Run Clean & Prepare first.", record: null },
          { status: 400 }
        );
      }
      trainingExamplesUsed = trainRows.length;
      const exportRows = trainRows.map(cleanRowToTrainingDataRow);
      jsonlContent = toOpenAIJSONL(exportRows);
    }

    const record = await createFineTunedModelRecord(trainingExamplesUsed);
    await updateFineTunedModel(record.id, { status: "uploading" });

    try {
      const fileId = await uploadFineTuningFile(jsonlContent);
      const updated = await updateFineTunedModel(record.id, {
        status: "uploaded",
        openai_file_id: fileId,
      });
      return NextResponse.json({ record: updated, progress: 100 });
    } catch (err) {
      const message = formatOpenAIError(err);
      const failed = await updateFineTunedModel(record.id, {
        status: "failed",
        error_message: message,
      });
      return NextResponse.json({ error: message, record: failed }, { status: 502 });
    }
  } catch (err) {
    return NextResponse.json(
      { error: formatOpenAIError(err), record: null },
      { status: 500 }
    );
  }
}
