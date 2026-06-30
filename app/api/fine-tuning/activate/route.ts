import { NextRequest, NextResponse } from "next/server";
import { activateFineTunedModel, getLatestFineTunedModel } from "@/app/lib/db";
import { formatOpenAIError } from "@/app/lib/fineTuning";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const recordId = typeof body.recordId === "string" ? body.recordId : "";

    const record = await getLatestFineTunedModel();
    if (!record || record.id !== recordId) {
      return NextResponse.json({ error: "Record not found", record: null }, { status: 404 });
    }

    if (!record.model_id || record.status !== "succeeded") {
      return NextResponse.json(
        { error: "Model not ready for activation", record },
        { status: 400 }
      );
    }

    const activated = await activateFineTunedModel(record.id);
    return NextResponse.json({ record: activated });
  } catch (err) {
    return NextResponse.json(
      { error: formatOpenAIError(err), record: null },
      { status: 500 }
    );
  }
}
