import { NextRequest, NextResponse } from "next/server";
import {
  createProjectFiles,
  getProject,
  getProjectFiles,
} from "@/app/lib/db";
import type { ProjectPlan } from "@/app/lib/agentTypes";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const projectId = body.projectId as string;
    if (!projectId) {
      return NextResponse.json({ error: "projectId required" }, { status: 400 });
    }

    const project = await getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const plan = project.plan as ProjectPlan;
    const files = await getProjectFiles(projectId);
    const codeFiles = files.filter((f) => f.file_path !== "PLAN.md");

    if (codeFiles.length === 0 && plan.files?.length > 0) {
      await createProjectFiles(projectId, plan);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Approve failed" },
      { status: 500 }
    );
  }
}
