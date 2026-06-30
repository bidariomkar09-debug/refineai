import { inngest } from "@/app/lib/inngest/client";
import {
  completeJob,
  createJob,
  failJob,
  getJob,
  startJob,
  updateJobProgress,
} from "./db";
import type { JobRecord } from "./settingsTypes";
import { runFileLoop } from "./fileLoopEngine";

export async function enqueueLoopRefineJob(payload: {
  target: string;
  file_path?: string;
  code?: string;
  model?: string;
  developerId?: string;
  apiKeyId?: string;
}): Promise<JobRecord> {
  const job = await createJob("loop_refine", payload);

  try {
    if (process.env.INNGEST_EVENT_KEY || process.env.INNGEST_SIGNING_KEY) {
      await inngest.send({
        name: "loop/refine.requested",
        data: { jobId: job.id },
      });
    } else {
      void executeJobById(job.id).catch(() => {});
    }
  } catch {
    void executeJobById(job.id).catch(() => {});
  }

  return job;
}

export async function executeJobById(jobId: string): Promise<void> {
  const job = await getJob(jobId);
  if (!job || job.status === "completed" || job.status === "failed") return;

  await startJob(jobId);

  try {
    if (job.job_type === "loop_refine") {
      const payload = (job.payload ?? {}) as {
        target?: string;
        file_path?: string;
        code?: string;
        model?: string;
      };
      const target = payload.target ?? "";
      const filePath = payload.file_path ?? "components/Generated.tsx";

      const result = await runFileLoop(
        {
          filePath,
          filePurpose: target.slice(0, 120),
          projectContext: `Background job\nTarget: ${target}`,
          completedFiles: payload.code ? "Existing code provided." : "No prior files.",
        },
        {
          onRound: async (event) => {
            await updateJobProgress(jobId, {
              round: event.round,
              task: event.task,
              score: event.score,
            }).catch(() => {});
          },
          onStatus: () => {},
        }
      );

      await completeJob(jobId, {
        output: result.content,
        score: result.score,
        rounds: result.roundsTaken,
        usage: { total_tokens: result.totalTokens },
        model: payload.model ?? "loop-v5",
      });
      return;
    }

    await failJob(jobId, "Unknown job type");
  } catch (err) {
    await failJob(jobId, err instanceof Error ? err.message : "Job failed");
  }
}
