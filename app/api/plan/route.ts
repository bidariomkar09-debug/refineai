import { NextRequest } from "next/server";
import { generatePlan } from "@/app/lib/planningEngine";
import {
  addMessage,
  createProject,
  createProjectFiles,
  testConnection,
} from "@/app/lib/db";
import { createSSEStream, sseResponse } from "@/app/lib/streamClient";
import { getPlanIntro } from "@/app/lib/planPresentation";
import { USER_MESSAGES } from "@/app/lib/userMessages";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const idea = typeof body.idea === "string" ? body.idea.trim() : "";

  if (!idea) {
    return new Response(JSON.stringify({ error: "idea required" }), {
      status: 400,
    });
  }

  const stream = createSSEStream(async (send) => {
    try {
      send({ type: "status", message: USER_MESSAGES.planning });
      await testConnection();

      const plan = await generatePlan(idea);
      const project = await createProject(plan);
      await createProjectFiles(project.id, plan);
      await addMessage(project.id, "user", idea, "chat");
      await addMessage(project.id, "assistant", getPlanIntro(plan), "plan", {
        plan,
      });

      send({ type: "plan", data: plan, projectId: project.id });
    } catch {
      send({ type: "status", message: USER_MESSAGES.fixing });
      // Retry once
      try {
        const plan = await generatePlan(idea);
        const project = await createProject(plan);
        await createProjectFiles(project.id, plan);
        send({ type: "plan", data: plan, projectId: project.id });
      } catch {
        send({ type: "status", message: USER_MESSAGES.planning });
      }
    }
  });

  return sseResponse(stream);
}
