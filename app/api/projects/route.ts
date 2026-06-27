import { NextRequest, NextResponse } from "next/server";
import {
  addMessage,
  deleteProjectFiles,
  createProjectFiles,
  getMessages,
  getProject,
  getProjectFiles,
  getProjects,
  updateFileStatus,
  updateProjectPlan,
  updateProjectStatus,
} from "@/app/lib/db";
import { generatePlanRevision } from "@/app/lib/planningEngine";
import { generateSummary } from "@/app/lib/agentAI";
import { createSSEStream, sseResponse } from "@/app/lib/streamClient";
import { USER_MESSAGES } from "@/app/lib/userMessages";
import type { ProjectPlan } from "@/app/lib/agentTypes";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");

  if (id) {
    const project = await getProject(id);
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const files = await getProjectFiles(id);
    const messages = await getMessages(id);
    return NextResponse.json({ project, files, messages });
  }

  const projects = await getProjects();
  return NextResponse.json({ projects });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const projectId = body.projectId as string;
  const message = body.message as string;
  const action = body.action as string;

  if (action === "confirm" && projectId) {
    await updateProjectStatus(projectId, "building");
    await addMessage(projectId, "assistant", "Starting build...", "confirm");
    return NextResponse.json({ ok: true, status: "building" });
  }

  if (!projectId || !message) {
    return NextResponse.json({ error: "projectId and message required" }, { status: 400 });
  }

  const stream = createSSEStream(async (send) => {
    send({ type: "status", message: USER_MESSAGES.changesReceived });

    const project = await getProject(projectId);
    if (!project) return;

    const currentPlan = project.plan as ProjectPlan;
    const revisedPlan = await generatePlanRevision(currentPlan, message);

    await updateProjectPlan(projectId, revisedPlan);
    await deleteProjectFiles(projectId);
    await createProjectFiles(projectId, revisedPlan);
    await addMessage(projectId, "user", message, "chat");
    await addMessage(projectId, "assistant", JSON.stringify(revisedPlan), "plan", {
      plan: revisedPlan,
    });

    send({ type: "plan", data: revisedPlan, projectId });
  });

  return sseResponse(stream);
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const projectId = body.projectId as string;
  const status = body.status as string;
  const fileId = body.fileId as string;
  const action = body.action as string;

  if (fileId && action === "skip") {
    await updateFileStatus(fileId, "skipped");
    return NextResponse.json({ ok: true });
  }

  if (projectId && status) {
    await updateProjectStatus(projectId, status as "paused" | "building");
    return NextResponse.json({ ok: true });
  }

  if (projectId) {
    const project = await getProject(projectId);
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const plan = project.plan as ProjectPlan;
    const summary = await generateSummary(plan);
    const fullPlan = {
      ...plan,
      setupInstructions: summary.setup,
      deployInstructions: summary.deploy,
    };
    await updateProjectStatus(projectId, "complete");
    await addMessage(
      projectId,
      "assistant",
      "Your project is ready!",
      "complete",
      { plan: fullPlan }
    );
    return NextResponse.json({ plan: fullPlan });
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}
