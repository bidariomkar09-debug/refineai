import { NextRequest, NextResponse } from "next/server";
import { getJob } from "@/app/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const job = await getJob(id);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    return NextResponse.json({
      id: job.id,
      object: "job",
      status: job.status,
      job_type: job.job_type,
      result: job.result,
      error: job.error,
      created_at: job.created_at,
      completed_at: job.completed_at,
      poll_url: `/api/jobs/${job.id}`,
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch job" }, { status: 500 });
  }
}
