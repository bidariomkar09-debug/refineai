import { NextRequest, NextResponse } from "next/server";
import { updateFileContent } from "@/app/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const fileId = body.fileId as string;
    const fixedContent = body.fixedContent as string;
    if (!fileId || typeof fixedContent !== "string") {
      return NextResponse.json({ error: "fileId and fixedContent required" }, { status: 400 });
    }
    const file = await updateFileContent(fileId, fixedContent);
    return NextResponse.json({ file });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Apply fix failed" },
      { status: 500 }
    );
  }
}
