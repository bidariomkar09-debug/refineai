import { NextResponse } from "next/server";
import { isPreviewDevOnly, stopPreview } from "@/app/lib/previewRunner";

export async function POST() {
  if (!isPreviewDevOnly()) {
    return NextResponse.json({ error: "Preview unavailable" }, { status: 403 });
  }

  await stopPreview();
  return NextResponse.json({ ok: true });
}
