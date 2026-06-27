import { NextRequest, NextResponse } from "next/server";
import { callLoopTask, OpenAIClientError } from "@/app/lib/openaiClient";
import type { LoopTask } from "@/app/lib/types";

const VALID_TASKS: LoopTask[] = ["generate", "critique", "refine"];

function isValidTask(value: unknown): value is LoopTask {
  return typeof value === "string" && VALID_TASKS.includes(value as LoopTask);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { target, currentOutput, lastCritique, round, task } = body;

    if (typeof target !== "string" || !target.trim()) {
      return NextResponse.json(
        { error: "target is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    if (typeof round !== "number" || round < 1 || !Number.isInteger(round)) {
      return NextResponse.json(
        { error: "round must be a positive integer" },
        { status: 400 }
      );
    }

    if (!isValidTask(task)) {
      return NextResponse.json(
        { error: "task must be one of: generate, critique, refine" },
        { status: 400 }
      );
    }

    if (
      currentOutput !== undefined &&
      typeof currentOutput !== "string"
    ) {
      return NextResponse.json(
        { error: "currentOutput must be a string" },
        { status: 400 }
      );
    }

    if (lastCritique !== undefined && typeof lastCritique !== "string") {
      return NextResponse.json(
        { error: "lastCritique must be a string" },
        { status: 400 }
      );
    }

    const result = await callLoopTask({
      target: target.trim(),
      currentOutput,
      lastCritique,
      round,
      task,
    });

    return NextResponse.json({
      ...result,
      round,
      task,
    });
  } catch (error) {
    if (error instanceof OpenAIClientError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }

    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
