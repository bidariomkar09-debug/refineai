import { NextResponse } from "next/server";
import {
  getPreviewState,
  isPreviewDevOnly,
  probePreviewUrl,
} from "@/app/lib/previewRunner";

export async function GET() {
  if (!isPreviewDevOnly()) {
    return NextResponse.json({ status: "idle", available: false });
  }

  const state = getPreviewState();
  const reachable = state.status === "running" ? await probePreviewUrl() : false;

  if (state.status === "running" && !reachable) {
    return NextResponse.json({
      ...state,
      status: "error",
      error: "Preview server not responding",
    });
  }

  return NextResponse.json({ ...state, reachable, available: true });
}
