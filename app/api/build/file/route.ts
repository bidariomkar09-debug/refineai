import { NextRequest } from "next/server";
import {
  completeFile,
  finalizeTrainingData,
  getCompletedFilesContext,
  getFile,
  getMessages,
  getProject,
  saveFileRound,
  saveTrainingData,
  updateFileStatus,
} from "@/app/lib/db";
import { runFileLoop, checkSyntax } from "@/app/lib/fileLoopEngine";
import { createSSEStream, sseResponse } from "@/app/lib/streamClient";
import { USER_MESSAGES } from "@/app/lib/userMessages";
import {
  meetsQualityThreshold,
  type ProjectPlan,
} from "@/app/lib/agentTypes";

function buildTrainingTarget(
  userIdea: string,
  filePath: string,
  filePurpose: string
): string {
  return `${userIdea} — File: ${filePath} (${filePurpose})`;
}

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

    const messages = await getMessages(projectId);
    const userIdea =
      messages.find((m) => m.role === "user")?.content ?? project.description;
    const filePurpose = plannedFile?.purpose ?? file.file_name;
    const target = buildTrainingTarget(userIdea, file.file_path, filePurpose);
    const trainingRowIds: string[] = [];

    try {
      const result = await runFileLoop(
        {
          filePath: file.file_path,
          filePurpose,
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

            try {
              const critique =
                event.task === "review"
                  ? event.review ?? event.output
                  : event.task === "refine"
                    ? event.critique ?? null
                    : null;

              const id = await saveTrainingData({
                session_id: projectId,
                target,
                round_number: event.round,
                input_context: event.inputContext,
                output: event.output,
                critique,
                score_before: event.scoreBefore,
                score_after: event.score,
                improvement: event.improvement,
                model_used: event.modelUsed,
              });
              trainingRowIds.push(id);
            } catch (err) {
              console.error("Failed to save training data:", err);
            }
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

      const wasSuccessful = meetsQualityThreshold(finalScore);

      try {
        await finalizeTrainingData(trainingRowIds, finalContent, wasSuccessful);
      } catch (err) {
        console.error("Failed to finalize training data:", err);
      }

      if (!wasSuccessful) {
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
      try {
        await finalizeTrainingData(trainingRowIds, "", false);
      } catch (err) {
        console.error("Failed to finalize training data:", err);
      }
      send({ type: "status", message: USER_MESSAGES.fixing });
      await updateFileStatus(fileId, "error");
    }
  });

  return sseResponse(stream);
}
