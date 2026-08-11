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
import type { ClarificationAnswer, ProjectPlan } from "@/app/lib/agentTypes";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const message = typeof body.message === "string" ? body.message.trim() : "";
  let projectId = typeof body.projectId === "string" ? body.projectId : undefined;
  const revise = body.revise === true;
  const submitClarifications = body.submitClarifications === true;
  const clarificationAnswers = Array.isArray(body.clarificationAnswers)
    ? (body.clarificationAnswers as ClarificationAnswer[])
    : undefined;

  if (!message && !submitClarifications) {
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
      send({ type: "status", message: "Generating your plan..." });

      if (!projectId) {
        const shell = await createProjectShell(
          (message || "New Project").slice(0, 60),
          message || "New Project"
        );
        projectId = shell.id;
        send({ type: "status", message: "Project created" });
      }

      if (message) {
        await addMessage(
          projectId!,
          "user",
          message,
          "chat",
          { planMode: true, submitClarifications },
          "plan"
        );
      }

      const project = await getProject(projectId!);
      const currentPlan = project?.plan as ProjectPlan | undefined;

      const result =
        revise && currentPlan?.files?.length
          ? await revisePlanMode({
              projectId: projectId!,
              message: message || "Update plan",
              currentPlan,
              clarificationAnswers,
              submitClarifications,
            })
          : await runPlanModeStep({
              projectId: projectId!,
              message: message || "Submit clarifications",
              clarificationAnswers,
              submitClarifications,
            });

      if (result.type === "clarifying") {
        await addMessage(
          projectId!,
          "assistant",
          "Answer a few quick questions so I can tailor your plan.",
          "chat",
          {
            planMode: true,
            clarifyingQuestions: result.questions,
            clarificationsComplete: false,
          },
          "plan"
        );
        send({
          type: "plan_clarifying",
          questions: result.questions,
          clarifications: result.clarifications,
          projectId: projectId!,
        });
        return;
      }

      await updateProjectPlan(projectId!, result.plan);
      await savePlanMarkdown(projectId!, result.markdown);
      await addMessage(
        projectId!,
        "assistant",
        result.visual.plainEnglish,
        "plan",
        {
          plan: result.plan,
          planMarkdown: result.markdown,
          visualPlan: result.visual,
          showPlanActions: true,
          clarificationsComplete: true,
          planMode: true,
        },
        "plan"
      );

      send({
        type: "plan_ready",
        data: { plan: result.plan, markdown: result.markdown, visual: result.visual },
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
