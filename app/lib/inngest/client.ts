import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "refineai",
  name: "RefineAI",
});

export type LoopRefineJobEvent = {
  name: "loop/refine.requested";
  data: {
    jobId: string;
  };
};
