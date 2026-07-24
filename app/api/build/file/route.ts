import { NextRequest } from "next/server";
import { getTemperature, modelUsedLabel, selectModelForRequest } from "@/app/lib/agentAI";
import {
  createTrainingSession,
  finalizeFileResult,
  finalizeTrainingData,
  getBuildCheckpoint,
  getCompletedFilesContext,
  getFile,
  getMessages,
  getProject,
  getProjectFiles,
  saveFileRound,
  saveTrainingData,
  updateBuildCheckpoint,
  updateFileStatus,
} from "@/app/lib/db";
import { resolveFileOutcome } from "@/app/lib/fileScoring";
import { runFileLoop, checkSyntax } from "@/app/lib/fileLoopEngine";
import { validateFileImports } from "@/app/lib/importGraph";
import { verifyFileRuntime } from "@/app/lib/runtimeVerify";
import { createSSEStream, sseResponse } from "@/app/lib/streamClient";
import {
  detectFileType,
  detectProjectType,
  detectTaskType,
} from "@/app/lib/trainingTags";
import { USER_MESSAGES } from "@/app/lib/userMessages";
import {
  FILE_MAX_ROUNDS,
  FILE_SCORE_THRESHOLD,
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

    const checkpoint = await getBuildCheckpoint(projectId);
    await updateBuildCheckpoint(projectId, {
      ...checkpoint,
      currentFileId: fileId,
      buildStartedAt: checkpoint.buildStartedAt ?? new Date().toISOString(),
    });

    const completedFiles = await getCompletedFilesContext(projectId);
    const messages = await getMessages(projectId);
    const userIdea =
      messages.find((m) => m.role === "user")?.content ?? project.description;
    const projectContext = [
      `Project: ${plan.name}`,
      `Description: ${plan.description}`,
      `Stack: ${JSON.stringify(plan.techStack)}`,
      "",
      "Original user requirements (follow ALL details exactly — copy, links, sections, colors, layout):",
      userIdea,
    ].join("\n");

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
              event.review,
              event.inputContext,
              event.memoryContext
            );

            await updateBuildCheckpoint(projectId, {
              currentFileId: fileId,
              completedFileIds: checkpoint.completedFileIds ?? [],
              buildStartedAt: checkpoint.buildStartedAt ?? new Date().toISOString(),
            });

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
          onRetry: (msg) => {
            send({ type: "retry", message: msg });
            send({ type: "status", message: msg, retry: true });
          },
        }
      );

      const syntax = checkSyntax(result.content);
      const finalContent = result.content;
      const aiScore = result.score;

      const allProjectFiles = await getProjectFiles(projectId);
      const projectFileMap: Record<string, string> = {};
      for (const f of allProjectFiles) {
        if ((f.status === "done" || f.id === fileId) && (f.id === fileId ? finalContent : f.content)) {
          const p = f.file_path.startsWith("/") ? f.file_path : `/${f.file_path}`;
          projectFileMap[p] = f.id === fileId ? finalContent : (f.content ?? "");
        }
      }
      const importCheck = validateFileImports(
        file.file_path,
        finalContent,
        projectFileMap
      );

      const staticPass = syntax.valid && importCheck.valid;
      const effectiveAiScore = staticPass
        ? Math.max(aiScore, FILE_SCORE_THRESHOLD)
        : aiScore;

      if (result.bestEffort) {
        const outcome = resolveFileOutcome({
          aiScore: effectiveAiScore,
          runtimeVerified: false,
          maxRoundsReached: true,
          staticPass,
          bestEffort: true,
        });

        await finalizeTraining(
          finalContent,
          outcome.displayScore,
          result.roundsTaken,
          false
        );

        await finalizeFileResult(fileId, {
          content: finalContent,
          aiScore: effectiveAiScore,
          displayScore: outcome.displayScore,
          status: outcome.status,
          runtimeVerified: false,
          runtimeErrors: [],
          roundsTaken: result.roundsTaken,
        });

        const completedIds = [...(checkpoint.completedFileIds ?? []), fileId];
        await updateBuildCheckpoint(projectId, {
          currentFileId: undefined,
          completedFileIds: completedIds,
          buildStartedAt: checkpoint.buildStartedAt,
        });

        send({
          type: "file_complete",
          fileId,
          score: outcome.displayScore,
          aiScore: effectiveAiScore,
          status: outcome.status,
          runtimeVerified: false,
          trainingExamples: trainingRowIds.length,
        });
        send({
          type: "complete",
          data: {
            score: outcome.displayScore,
            content: finalContent,
            roundsTaken: result.roundsTaken,
          },
        });
        return;
      }

      if (!staticPass) {
        send({ type: "status", message: USER_MESSAGES.fixing });
        await updateFileStatus(fileId, "building");
        return;
      }

      send({ type: "status", message: "Verifying runtime..." });
      const runtime = await verifyFileRuntime({
        projectId,
        file,
        allProjectFiles,
        content: finalContent,
      });

      const outcome = resolveFileOutcome({
        aiScore: effectiveAiScore,
        runtimeVerified: runtime.ok,
        maxRoundsReached: result.roundsTaken >= FILE_MAX_ROUNDS,
        staticPass,
      });

      const wasSuccessful = outcome.status === "done" && outcome.runtimeVerified;
      await finalizeTraining(
        finalContent,
        outcome.displayScore,
        result.roundsTaken,
        wasSuccessful
      );

      if (outcome.status === "building") {
        send({ type: "status", message: USER_MESSAGES.fixing });
        await updateFileStatus(fileId, "building");
        return;
      }

      await finalizeFileResult(fileId, {
        content: finalContent,
        aiScore: effectiveAiScore,
        displayScore: outcome.displayScore,
        status: outcome.status,
        runtimeVerified: outcome.runtimeVerified,
        runtimeErrors: runtime.errors,
        roundsTaken: result.roundsTaken,
      });

      const completedIds = [...(checkpoint.completedFileIds ?? []), fileId];
      await updateBuildCheckpoint(projectId, {
        currentFileId: undefined,
        completedFileIds: completedIds,
        buildStartedAt: checkpoint.buildStartedAt,
      });

      send({
        type: "file_complete",
        fileId,
        score: outcome.displayScore,
        aiScore: effectiveAiScore,
        status: outcome.status,
        runtimeVerified: outcome.runtimeVerified,
        runtimeErrors: runtime.errors,
        trainingExamples: trainingRowIds.length,
      });
      send({
        type: "complete",
        data: {
          score: outcome.displayScore,
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
