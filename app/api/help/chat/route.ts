import { NextRequest, NextResponse } from "next/server";
import { answerFromKnowledgeBase } from "@/app/lib/helpKnowledge";
import { countRateLimitEvents, logHelpQuestion, recordRateLimitEvent } from "@/app/lib/db";
import { checkRateLimit, rateLimitHeaders } from "@/app/lib/rateLimit";

export async function POST(request: NextRequest) {
  try {
    const clientKey =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "help-anon";

    const rate = await checkRateLimit(
      `help:${clientKey}`,
      "free",
      recordRateLimitEvent,
      countRateLimitEvents
    );

    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429, headers: rateLimitHeaders(rate) }
      );
    }

    const body = await request.json();
    const question = typeof body.question === "string" ? body.question.trim() : "";
    if (!question) {
      return NextResponse.json({ error: "question required" }, { status: 400 });
    }

    const result = answerFromKnowledgeBase(question);

    void logHelpQuestion({
      question,
      answer: result.answer,
      confidence: result.confidence,
      escalated: result.escalated,
    }).catch(() => {});

    return NextResponse.json(result, { headers: rateLimitHeaders(rate) });
  } catch {
    return NextResponse.json({
      answer: "Something went wrong. Please email support@refineai.app",
      confidence: 0,
      escalated: true,
      sources: [],
    });
  }
}
