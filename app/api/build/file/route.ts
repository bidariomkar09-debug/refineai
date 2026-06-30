import { NextRequest } from "next/server";
import { getTemperature, modelUsedLabel, selectModelForRequest } from "@/app/lib/agentAI";
import {
  completeFile,
  createTrainingSession,
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
import {
  detectFileType,
  detectProjectType,
  detectTaskType,
} from "@/app/lib/trainingTags";
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
    let startScore = 0;

    const fileType = detectFileType(file.file_path);
    const projectType = detectProjectType(project.niche, plan);

    let sessionId: string | null = null;
    try {
      const [resolved, temperature] = await Promise.all([
        selectModelForRequest(),
        getTemperature(),
      ]);
      const model = modelUsedLabel(resolved);
      sessionId = await createTrainingSession(userIdea, model, temperature);
    } catch {
      sessionId = null;
    }

    const finalizeTraining = async (
      finalContent: string,
      finalScore: number,
      roundsTaken: number,
      wasSuccessful: boolean
    ) => {
      if (trainingRowIds.length === 0) return;
      try {
        await finalizeTrainingData(trainingRowIds, {
          finalOutput: finalContent,
          wasSuccessful,
          reachedThreshold: wasSuccessful,
          roundsToComplete: roundsTaken,
          improvementSummary: `Score ${startScore}→${finalScore} over ${roundsTaken} round${roundsTaken === 1 ? "" : "s"}`,
        });
      } catch {
        // silent
      }
    };

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

            if (event.round === 1 && event.task === "write") {
              startScore = event.scoreBefore;
            }

            const critique =
              event.task === "review"
                ? event.review ?? event.output
                : event.task === "refine"
                  ? event.critique ?? null
                  : null;

            const taskType = detectTaskType(event.task, file.file_path, filePurpose);

            void saveTrainingData({
              session_id: sessionId,
              project_id: projectId,
              target,
              round_number: event.round,
              input_context: event.inputContext,
              output: event.output,
              critique,
              score_before: event.scoreBefore,
              score_after: event.score,
              score_improvement: event.scoreImprovement,
              improvement_summary: event.improvement,
              model_used: event.modelUsed,
              temperature: event.temperature,
              tokens_used: event.tokensUsed,
              project_type: projectType,
              file_type: fileType,
              task_type: taskType,
            })
              .then((id) => {
                trainingRowIds.push(id);
              })
              .catch(() => {});
          },
          onStatus: (msg) => send({ type: "status", message: msg }),
        }
      );

      const syntax = checkSyntax(result.content);
      const finalContent = result.content;
      const finalScore = result.score;

      if (!syntax.valid && !meetsQualityThreshold(result.score)) {
        send({ type: "status", message: USER_MESSAGES.fixing });
      }

      const wasSuccessful = meetsQualityThreshold(finalScore);
      await finalizeTraining(finalContent, finalScore, result.roundsTaken, wasSuccessful);

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
      await finalizeTraining("", 0, 0, false);
      send({ type: "status", message: USER_MESSAGES.fixing });
      await updateFileStatus(fileId, "error");
    }
  });

  return sseResponse(stream);
}
