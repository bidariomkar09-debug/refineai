import { NextRequest } from "next/server";
import type { PreviewLogLine, PreviewState } from "@/app/lib/previewTypes";
import {
  getPreviewLogs,
  isPreviewDevOnly,
  startPreview,
  subscribePreviewLogs,
} from "@/app/lib/previewRunner";

type PreviewSSE =
  | { type: "log"; data: PreviewLogLine }
  | { type: "status"; data: PreviewState };

export async function POST(request: NextRequest) {
  if (!isPreviewDevOnly()) {
    return new Response(JSON.stringify({ error: "Preview unavailable" }), { status: 403 });
  }

  const body = await request.json();
  const projectId = body.projectId as string;
  if (!projectId) {
    return new Response(JSON.stringify({ error: "projectId required" }), { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: PreviewSSE) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      for (const line of getPreviewLogs()) {
        send({ type: "log", data: line });
      }

      const unsubscribe = subscribePreviewLogs((line) => {
        send({ type: "log", data: line });
      });

      try {
        const result = await startPreview(projectId);
        send({ type: "status", data: result });
      } catch {
        send({
          type: "status",
          data: {
            status: "error",
            port: 3001,
            url: "http://localhost:3001",
            projectId,
            lastUpdated: new Date().toISOString(),
            error: "Preview failed to start",
          },
        });
      } finally {
        unsubscribe();
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
