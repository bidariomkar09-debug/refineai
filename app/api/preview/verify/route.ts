import { NextRequest, NextResponse } from "next/server";
import { getProjectFiles } from "@/app/lib/db";
import { verifyProjectPreview } from "@/app/lib/previewVerify";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const projectId = body.projectId as string;

    if (!projectId) {
      return NextResponse.json({ ok: false, errors: ["projectId required"] }, { status: 400 });
    }

    const files = await getProjectFiles(projectId);
    const result = verifyProjectPreview(files);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Verify failed";
    return NextResponse.json({ ok: false, errors: [message] }, { status: 500 });
  }
}
