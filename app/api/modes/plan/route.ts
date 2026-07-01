import { NextRequest } from "next/server";
import {
  addMessage,
  createProjectShell,
  getProject,
  savePlanMarkdown,
  updateProjectPlan,
} from "@/app/lib/db";
import { runPlanModeStep, revisePlanMode } from "@/app/lib/planModeEngine";
import { createSSEStream, sseResponse } from "@/app/lib/streamClient";
import { apiErrorMessage } from "@/app/lib/apiErrorMessage";
import type { ProjectPlan } from "@/app/lib/agentTypes";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const message = typeof body.message === "string" ? body.message.trim() : "";
  let projectId = typeof body.projectId === "string" ? body.projectId : undefined;
  const revise = body.revise === true;

  if (!message) {
    return new Response(JSON.stringify({ error: "message required" }), { status: 400 });
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
    try {
      send({ type: "status", message: "Planning..." });

      if (!projectId) {
        const shell = await createProjectShell(
          message.slice(0, 60) || "New Project",
          message
        );
        projectId = shell.id;
        send({ type: "status", message: "Project created" });
      }

      await addMessage(projectId!, "user", message, "chat", { planMode: true }, "plan");

      const project = await getProject(projectId!);
      const currentPlan = project?.plan as ProjectPlan | undefined;

      const result =
        revise && currentPlan?.files?.length
          ? await revisePlanMode({
              projectId: projectId!,
              message,
              currentPlan,
            })
          : await runPlanModeStep({ projectId: projectId!, message });

      if (result.type === "question") {
        await addMessage(
          projectId!,
          "assistant",
          result.content,
          "chat",
          { planMode: true, planQuestionOptions: result.options },
          "plan"
        );
        send({
          type: "plan_question",
          content: result.content,
          options: result.options,
          projectId: projectId!,
        });
        return;
      }

      await updateProjectPlan(projectId!, result.plan);
      await savePlanMarkdown(projectId!, result.markdown);
      await addMessage(
        projectId!,
        "assistant",
        result.markdown,
        "plan",
        {
          plan: result.plan,
          planMarkdown: result.markdown,
          showPlanActions: true,
          planMode: true,
        },
        "plan"
      );

      send({
        type: "plan_ready",
        data: { plan: result.plan, markdown: result.markdown },
        projectId: projectId!,
      });
    } catch (err) {
      send({
        type: "error",
        message: apiErrorMessage(err),
      });
    }
  });

  return sseResponse(stream);
}
