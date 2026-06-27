import { NextRequest } from "next/server";
import {
  addMessage,
  getProject,
  updateProjectPlan,
  deleteProjectFiles,
  createProjectFiles,
} from "@/app/lib/db";
import { generatePlanRevision } from "@/app/lib/planningEngine";
import { createSSEStream, sseResponse } from "@/app/lib/streamClient";
import { USER_MESSAGES } from "@/app/lib/userMessages";
import type { ProjectPlan } from "@/app/lib/agentTypes";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const projectId = body.projectId as string;
  const message = body.message as string;

  if (!projectId || !message?.trim()) {
    return new Response(JSON.stringify({ error: "projectId and message required" }), {
      status: 400,
    });
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
