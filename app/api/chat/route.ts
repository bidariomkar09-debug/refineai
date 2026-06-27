import { NextRequest, NextResponse } from "next/server";
import { callLoopTask, OpenAIClientError } from "@/app/lib/openaiClient";
import { DEFAULT_DEV_CONFIG } from "@/app/lib/developerConfig";
import type { LoopTask } from "@/app/lib/types";

const VALID_TASKS: LoopTask[] = ["generate", "critique", "refine"];
const VALID_MODELS = ["gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo"];

function isValidTask(value: unknown): value is LoopTask {
  return typeof value === "string" && VALID_TASKS.includes(value as LoopTask);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      target,
      currentOutput,
      lastCritique,
      round,
      task,
      systemPrompt,
      model,
      temperature,
      jsonMode,
    } = body;

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

    const resolvedModel =
      typeof model === "string" && VALID_MODELS.includes(model)
        ? model
        : DEFAULT_DEV_CONFIG.model;

    const resolvedTemperature =
      typeof temperature === "number" &&
      temperature >= 0 &&
      temperature <= 1
        ? temperature
        : DEFAULT_DEV_CONFIG.temperature;

    const resolvedSystemPrompt =
      typeof systemPrompt === "string" && systemPrompt.trim()
        ? systemPrompt.trim()
        : DEFAULT_DEV_CONFIG.systemPrompt;

    const resolvedJsonMode = typeof jsonMode === "boolean" ? jsonMode : false;

    const result = await callLoopTask({
      target: target.trim(),
      currentOutput,
      lastCritique,
      round,
      task,
      systemPrompt: resolvedSystemPrompt,
      model: resolvedModel,
      temperature: resolvedTemperature,
      jsonMode: resolvedJsonMode,
    });

    return NextResponse.json({
      output: result.output,
      critique: result.critique,
      score: result.score,
      round,
      task,
      usage: result.usage,
      rawContent: result.rawContent,
      apiSnapshot: result.apiSnapshot,
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
