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
import { apiErrorMessage } from "@/app/lib/apiErrorMessage";

export const maxDuration = 120;

async function runPlan(idea: string) {
  await testConnection();
  const plan = await generatePlan(idea);
  const project = await createProject(plan);
  await createProjectFiles(project.id, plan);
  await addMessage(project.id, "user", idea, "chat");
  await addMessage(project.id, "assistant", getPlanIntro(plan), "plan", { plan });
  return { plan, projectId: project.id };
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const idea = typeof body.idea === "string" ? body.idea.trim() : "";

  if (!idea) {
    return new Response(JSON.stringify({ error: "idea required" }), {
      status: 400,
    });
  }

  if (!process.env.OPENAI_API_KEY?.trim()) {
    const stream = createSSEStream(async (send) => {
      send({
        type: "error",
        message:
          "OpenAI API key is not configured. Add OPENAI_API_KEY in Vercel → Settings → Environment Variables, then redeploy.",
      });
    });
    return sseResponse(stream);
  }

  const stream = createSSEStream(async (send) => {
    send({ type: "status", message: USER_MESSAGES.planning });

    try {
      const result = await runPlan(idea);
      send({ type: "plan", data: result.plan, projectId: result.projectId });
      return;
    } catch (firstErr) {
      send({ type: "status", message: USER_MESSAGES.fixing });
      try {
        const result = await runPlan(idea);
        send({ type: "plan", data: result.plan, projectId: result.projectId });
      } catch (retryErr) {
        send({ type: "error", message: apiErrorMessage(retryErr ?? firstErr) });
      }
    }
  });

  return sseResponse(stream);
}
