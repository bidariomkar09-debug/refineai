import { NextRequest } from "next/server";
import { addMessage, getProjectFiles } from "@/app/lib/db";
import { analyzeBug } from "@/app/lib/debugModeEngine";
import { createSSEStream, sseResponse } from "@/app/lib/streamClient";
import { apiErrorMessage } from "@/app/lib/apiErrorMessage";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const projectId = typeof body.projectId === "string" ? body.projectId : "";

  if (!message || !projectId) {
    return new Response(JSON.stringify({ error: "projectId and message required" }), {
      status: 400,
    });
  }

  const stream = createSSEStream(async (send) => {
    try {
      const files = await getProjectFiles(projectId);
      const doneCount = files.filter((f) => f.status === "done").length;
      if (doneCount === 0) {
        send({
          type: "message",
          content: "Open a built project with completed files to use Debug mode.",
          mode: "debug",
        });
        return;
      }

      send({ type: "status", message: "Analyzing bug..." });
      await addMessage(projectId, "user", message, "chat", {}, "debug");

      const { content, proposal } = await analyzeBug({ message, files });
      await addMessage(
        projectId,
        "assistant",
        content,
        "chat",
        { debugProposal: proposal, showDebugActions: true },
        "debug"
      );

      send({ type: "debug", data: proposal, content, projectId });
    } catch (err) {
      send({
        type: "error",
        message: apiErrorMessage(err),
      });
    }
  });

  return sseResponse(stream);
}
