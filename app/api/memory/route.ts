import { NextRequest, NextResponse } from "next/server";
import {
  getMessages,
  getPersonalMemory,
  getProject,
  getProjectFiles,
  upsertPersonalMemory,
} from "@/app/lib/db";
import { extractMemoryFromProject } from "@/app/lib/memoryExtractor";
import {
  applyMemoryOverrides,
  mergePersonalMemory,
  normalizePersonalMemory,
} from "@/app/lib/personalMemory";
import type { PersonalMemory } from "@/app/lib/personalMemoryTypes";

export async function GET() {
  try {
    const memory = await getPersonalMemory();
    return NextResponse.json({ memory });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load memory" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const current = await getPersonalMemory();

    let next: PersonalMemory = current;

    if (body.memory) {
      next = mergePersonalMemory(current, normalizePersonalMemory(body.memory));
    }

    if (body.userEditedNotes !== undefined) {
      next = mergePersonalMemory(next, {
        userEditedNotes: String(body.userEditedNotes),
      });
    }

    if (body.userOverrides) {
      next = applyMemoryOverrides(next, body.userOverrides);
    }

    if (body.preferredStack) {
      next = mergePersonalMemory(next, {
        preferredStack: { ...next.preferredStack, ...body.preferredStack },
      });
    }

    if (Array.isArray(body.codingStyle)) {
      next = mergePersonalMemory(next, { codingStyle: body.codingStyle });
    }
    if (Array.isArray(body.designTaste)) {
      next = mergePersonalMemory(next, { designTaste: body.designTaste });
    }
    if (Array.isArray(body.codingPatterns)) {
      next = mergePersonalMemory(next, { codingPatterns: body.codingPatterns });
    }
    if (Array.isArray(body.pastProjectSummaries)) {
      next = mergePersonalMemory(next, {
        pastProjectSummaries: body.pastProjectSummaries,
      });
    }

    const memory = await upsertPersonalMemory(next);
    return NextResponse.json({ memory });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save memory" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const projectId = body.projectId as string;

    if (!projectId) {
      return NextResponse.json({ error: "projectId required" }, { status: 400 });
    }

    const project = await getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const [files, messages, current] = await Promise.all([
      getProjectFiles(projectId),
      getMessages(projectId),
      getPersonalMemory(),
    ]);

    const memory = await upsertPersonalMemory(
      extractMemoryFromProject(current, project, files, messages)
    );

    return NextResponse.json({ memory });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to extract memory" },
      { status: 500 }
    );
  }
}
