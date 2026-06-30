import { NextRequest, NextResponse } from "next/server";
import {
  authenticateLoopModelRequest,
  hashApiKey,
  loopModelErrorResponse,
  LOOPMODEL_API_KEY_PREFIX,
} from "@/app/lib/loopmodelApi";
import {
  countRateLimitEvents,
  getLoopModelApiKeyByHash,
  getLoopModelDevelopers,
  recordRateLimitEvent,
} from "@/app/lib/db";
import { enqueueLoopRefineJob } from "@/app/lib/jobProcessor";
import {
  checkRateLimit,
  rateLimitHeaders,
  tierFromPlan,
} from "@/app/lib/rateLimit";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    let tier = "free" as ReturnType<typeof tierFromPlan>;
    let clientKey =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";

    if (authHeader?.startsWith("Bearer ")) {
      const key = authHeader.slice(7).trim();
      if (key.startsWith(LOOPMODEL_API_KEY_PREFIX)) {
        const record = await getLoopModelApiKeyByHash(hashApiKey(key));
        if (record) {
          clientKey = record.id;
          const devs = await getLoopModelDevelopers();
          const dev = devs.find((d) => d.id === record.developer_id);
          tier = tierFromPlan(dev?.plan);
        }
      }
    }

    const rate = await checkRateLimit(
      clientKey,
      tier,
      recordRateLimitEvent,
      countRateLimitEvents
    );

    if (!rate.allowed) {
      return NextResponse.json(
        { error: { message: "Rate limit exceeded", type: "rate_limit_exceeded" } },
        { status: 429, headers: rateLimitHeaders(rate) }
      );
    }

    const auth = await authenticateLoopModelRequest(authHeader);
    const body = await request.json();

    const job = await enqueueLoopRefineJob({
      target: body.target,
      file_path: body.file_path,
      code: body.code,
      model: body.model,
      developerId: auth.developerId,
      apiKeyId: auth.apiKeyId,
    });

    return NextResponse.json(
      {
        job_id: job.id,
        object: "job",
        status: job.status,
        poll_url: `/api/jobs/${job.id}`,
        message: "Job queued. Poll poll_url for status and result.",
      },
      { headers: rateLimitHeaders(rate) }
    );
  } catch (err) {
    return loopModelErrorResponse(err);
  }
}
