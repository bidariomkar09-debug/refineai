import { NextRequest, NextResponse } from "next/server";
import { isPreviewDevOnly, syncPreview } from "@/app/lib/previewRunner";

export async function POST(request: NextRequest) {
  if (!isPreviewDevOnly()) {
    return NextResponse.json({ error: "Preview unavailable" }, { status: 403 });
  }

  const body = await request.json();
  const projectId = body.projectId as string;
  if (!projectId) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 });
  }

  const state = await syncPreview(projectId);
  return NextResponse.json(state);
}
