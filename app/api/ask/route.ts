import { NextRequest } from "next/server";
import { answerQuestion } from "@/app/lib/askModeEngine";
import { addMessage } from "@/app/lib/db";
import { createSSEStream, sseResponse } from "@/app/lib/streamClient";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const projectId = typeof body.projectId === "string" ? body.projectId : undefined;

  if (!message) {
    return new Response(JSON.stringify({ error: "message required" }), { status: 400 });
  }

  const stream = createSSEStream(async (send) => {
    try {
      send({ type: "status", message: "Thinking..." });
      const answer = await answerQuestion({ message, projectId });
      if (projectId) {
        await addMessage(projectId, "user", message, "chat", {}, "ask");
        await addMessage(projectId, "assistant", answer, "chat", {}, "ask");
      }
      send({ type: "message", content: answer, mode: "ask" });
    } catch (err) {
      send({
        type: "error",
        message: err instanceof Error ? err.message : "Ask failed",
      });
    }
  });

  return sseResponse(stream);
}
