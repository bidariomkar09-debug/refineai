import { NextRequest, NextResponse } from "next/server";
import { completeFile, getProjectFiles, updateFileContent } from "@/app/lib/db";
import { FILE_SCORE_THRESHOLD } from "@/app/lib/agentTypes";
import { wireAppEntryFromDbFiles } from "@/app/lib/wireAppEntry";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const projectId = body.projectId as string;

  if (!projectId) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 });
  }

  const files = await getProjectFiles(projectId);
  const wired = wireAppEntryFromDbFiles(files);
  if (!wired) {
    return NextResponse.json({ ok: true, updated: false });
  }

  const appFile = files.find((f) => f.file_path.replace(/\\/g, "/") === wired.appPath);
  if (!appFile) {
    return NextResponse.json({ ok: true, updated: false });
  }

  await updateFileContent(appFile.id, wired.content);
  await completeFile(appFile.id, wired.content, FILE_SCORE_THRESHOLD, 1);
  return NextResponse.json({
    ok: true,
    updated: true,
    appPath: wired.appPath,
  });
}
