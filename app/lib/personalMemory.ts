import type {
  PersonalMemory,
  PersonalMemoryOverrides,
  PreferredStackMemory,
} from "./personalMemoryTypes";

export const EMPTY_PERSONAL_MEMORY: PersonalMemory = {
  preferredStack: {},
  codingStyle: [],
  designTaste: [],
  codingPatterns: [],
  pastProjectSummaries: [],
  userEditedNotes: "",
  lastUpdatedAt: new Date().toISOString(),
};

const MAX_SUMMARIES = 12;
const MAX_ITEMS = 8;
const PROMPT_CHAR_LIMIT = 900;

function uniqueStrings(items: string[], max = MAX_ITEMS): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const trimmed = item.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
    if (out.length >= max) break;
  }
  return out;
}

export function normalizePersonalMemory(raw: unknown): PersonalMemory {
  if (!raw || typeof raw !== "object") return { ...EMPTY_PERSONAL_MEMORY };

  const data = raw as Partial<PersonalMemory>;
  return {
    preferredStack: { ...(data.preferredStack ?? {}) },
    codingStyle: Array.isArray(data.codingStyle) ? data.codingStyle : [],
    designTaste: Array.isArray(data.designTaste) ? data.designTaste : [],
    codingPatterns: Array.isArray(data.codingPatterns) ? data.codingPatterns : [],
    pastProjectSummaries: Array.isArray(data.pastProjectSummaries)
      ? data.pastProjectSummaries.slice(0, MAX_SUMMARIES)
      : [],
    userEditedNotes: typeof data.userEditedNotes === "string" ? data.userEditedNotes : "",
    userOverrides: data.userOverrides,
    lastUpdatedAt:
      typeof data.lastUpdatedAt === "string"
        ? data.lastUpdatedAt
        : new Date().toISOString(),
  };
}

export function mergePersonalMemory(
  current: PersonalMemory,
  patch: Partial<PersonalMemory>
): PersonalMemory {
  const base = normalizePersonalMemory(current);
  const merged: PersonalMemory = {
    ...base,
    ...patch,
    preferredStack: { ...base.preferredStack, ...patch.preferredStack },
    codingStyle: patch.codingStyle ?? base.codingStyle,
    designTaste: patch.designTaste ?? base.designTaste,
    codingPatterns: patch.codingPatterns ?? base.codingPatterns,
    pastProjectSummaries: patch.pastProjectSummaries ?? base.pastProjectSummaries,
    userEditedNotes:
      patch.userEditedNotes !== undefined ? patch.userEditedNotes : base.userEditedNotes,
    userOverrides: patch.userOverrides ?? base.userOverrides,
    lastUpdatedAt: new Date().toISOString(),
  };
  return normalizePersonalMemory(merged);
}

export function effectiveStack(memory: PersonalMemory): PreferredStackMemory {
  return {
    ...memory.preferredStack,
    ...memory.userOverrides?.preferredStack,
  };
}

export function effectiveList(
  inferred: string[],
  override?: string[]
): string[] {
  if (override && override.length > 0) return uniqueStrings(override);
  return uniqueStrings(inferred);
}

export function formatMemoryForPrompt(memory: PersonalMemory): string {
  const stack = effectiveStack(memory);
  const codingStyle = effectiveList(
    memory.codingStyle,
    memory.userOverrides?.codingStyle
  );
  const designTaste = effectiveList(
    memory.designTaste,
    memory.userOverrides?.designTaste
  );
  const codingPatterns = effectiveList(
    memory.codingPatterns,
    memory.userOverrides?.codingPatterns
  );

  const lines: string[] = ["[Personal memory — apply unless the user overrides now]"];

  const stackParts = Object.entries(stack)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`);
  if (stackParts.length > 0) {
    lines.push(`Preferred stack: ${stackParts.join(", ")}`);
  }
  if (codingStyle.length > 0) {
    lines.push(`Coding style: ${codingStyle.join("; ")}`);
  }
  if (designTaste.length > 0) {
    lines.push(`Design taste: ${designTaste.join("; ")}`);
  }
  if (codingPatterns.length > 0) {
    lines.push(`Coding patterns: ${codingPatterns.join("; ")}`);
  }

  const recent = memory.pastProjectSummaries.slice(0, 4);
  if (recent.length > 0) {
    lines.push(
      "Past projects: " +
        recent.map((p) => `${p.name} (${p.niche}) — ${p.summary}`).join(" | ")
    );
  }

  if (memory.userEditedNotes.trim()) {
    lines.push(`User notes: ${memory.userEditedNotes.trim()}`);
  }

  let text = lines.join("\n");
  if (text.length > PROMPT_CHAR_LIMIT) {
    text = `${text.slice(0, PROMPT_CHAR_LIMIT)}…`;
  }
  return text === "[Personal memory — apply unless the user overrides now]"
    ? ""
    : text;
}

export function applyMemoryOverrides(
  memory: PersonalMemory,
  overrides: PersonalMemoryOverrides
): PersonalMemory {
  return mergePersonalMemory(memory, {
    userOverrides: {
      ...memory.userOverrides,
      ...overrides,
    },
  });
}
