import { executeJobById } from "@/app/lib/jobProcessor";
import { inngest } from "./client";

export const processLoopRefineJob = inngest.createFunction(
  {
    id: "process-loop-refine",
    retries: 2,
    triggers: { event: "loop/refine.requested" },
  },
  async ({ event }) => {
    await executeJobById(event.data.jobId);
    return { ok: true };
  }
);

export const inngestFunctions = [processLoopRefineJob];
