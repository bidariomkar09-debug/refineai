import { NextRequest, NextResponse } from "next/server";
import { getBuildCheckpoint, getProject, getProjectFiles } from "@/app/lib/db";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const projectId = body.projectId as string;

  if (!projectId) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 });
  }

  const project = await getProject(projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const files = await getProjectFiles(projectId);
  const checkpoint = await getBuildCheckpoint(projectId);
  const completedIds = new Set(checkpoint.completedFileIds ?? []);

  const remaining = files.filter(
    (f) =>
      f.status !== "skipped" &&
      f.status !== "done" &&
      f.status !== "best_effort" &&
      !completedIds.has(f.id)
  );

  return NextResponse.json({
    ok: true,
    projectId,
    status: project.status,
    checkpoint,
    remainingFileIds: remaining.map((f) => f.id),
    remainingFiles: remaining.map((f) => ({
      id: f.id,
      file_path: f.file_path,
      status: f.status,
    })),
  });
}
