import { NextRequest } from "next/server";
import {
  completeFile,
  getCompletedFilesContext,
  getFile,
  getProject,
  saveFileRound,
  updateFileStatus,
} from "@/app/lib/db";
import { runFileLoop, checkSyntax } from "@/app/lib/fileLoopEngine";
import { createSSEStream, sseResponse } from "@/app/lib/streamClient";
import { USER_MESSAGES } from "@/app/lib/userMessages";
import {
  meetsQualityThreshold,
  type ProjectPlan,
} from "@/app/lib/agentTypes";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const fileId = body.fileId as string;
  const projectId = body.projectId as string;

  if (!fileId || !projectId) {
    return new Response(JSON.stringify({ error: "fileId and projectId required" }), {
      status: 400,
    });
  }

  const stream = createSSEStream(async (send) => {
    const file = await getFile(fileId);
    const project = await getProject(projectId);
    if (!file || !project) {
      send({ type: "status", message: USER_MESSAGES.fixing });
      return;
    }

    const plan = project.plan as ProjectPlan;
    const plannedFile = plan.files.find((f) => f.path === file.file_path);

    send({
      type: "file_start",
      filePath: file.file_path,
      fileName: file.file_name,
    });

    await updateFileStatus(fileId, "building");

    const completedFiles = await getCompletedFilesContext(projectId);
    const projectContext = `Project: ${plan.name}\nDescription: ${plan.description}\nStack: ${JSON.stringify(plan.techStack)}`;

    try {
      const result = await runFileLoop(
        {
          filePath: file.file_path,
          filePurpose: plannedFile?.purpose ?? file.file_name,
          projectContext,
          completedFiles,
        },
        {
          onRound: async (event) => {
            send({ type: "round", data: event });
            await saveFileRound(
              fileId,
              event.round,
              event.task,
              event.score,
              event.code,
              event.review
            );
          },
          onStatus: (msg) => send({ type: "status", message: msg }),
        }
      );

      const syntax = checkSyntax(result.content);
      let finalContent = result.content;
      let finalScore = result.score;

      if (!syntax.valid && !meetsQualityThreshold(result.score)) {
        send({ type: "status", message: USER_MESSAGES.fixing });
      }

      if (!meetsQualityThreshold(finalScore)) {
        send({ type: "status", message: USER_MESSAGES.fixing });
        await updateFileStatus(fileId, "building");
        return;
      }

      await completeFile(fileId, finalContent, finalScore, result.roundsTaken);
      send({
        type: "file_complete",
        fileId,
        score: finalScore,
      });
      send({
        type: "complete",
        data: {
          score: finalScore,
          content: finalContent,
          roundsTaken: result.roundsTaken,
        },
      });
    } catch {
      send({ type: "status", message: USER_MESSAGES.fixing });
      await updateFileStatus(fileId, "error");
    }
  });

  return sseResponse(stream);
}
