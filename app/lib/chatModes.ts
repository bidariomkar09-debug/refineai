export type ChatMode = "agent" | "ask" | "plan" | "debug";

export const CHAT_MODES: ChatMode[] = ["agent", "ask", "plan", "debug"];

export const MODE_STORAGE_KEY = "refineai-chat-mode";

export type ModeMeta = {
  id: ChatMode;
  label: string;
  description: string;
  badgeClass: string;
};

export const MODE_META: Record<ChatMode, ModeMeta> = {
  agent: {
    id: "agent",
    label: "Agent",
    description: "Builds your full app autonomously",
    badgeClass: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  },
  ask: {
    id: "ask",
    label: "Ask",
    description: "Answers questions without building or changing code",
    badgeClass: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  },
  plan: {
    id: "plan",
    label: "Plan",
    description: "Creates a detailed plan before any code is written",
    badgeClass: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  },
  debug: {
    id: "debug",
    label: "Debug",
    description: "Finds and fixes bugs in your built project",
    badgeClass: "bg-red-500/20 text-red-400 border-red-500/30",
  },
};

export const ASK_SYSTEM_PROMPT = `You are a helpful coding assistant for RefineAI. Answer questions about code, architecture, and best practices. DO NOT build or modify any files. Just explain, suggest, and advise. You may show code snippets as examples only — never imply you are writing files to the project.`;

export const PLAN_MODE_SYSTEM_PROMPT = `You are a senior software architect. Before building anything, ask clarifying questions and create a thorough plan. Show the plan clearly and wait for user approval before writing any code. When asking questions, ask one focused question at a time. When producing a plan, be specific about files, tech stack reasoning, risks, and complexity.`;

export const DEBUG_SYSTEM_PROMPT = `You are an expert debugger. Analyse the bug described by the user. Look through the relevant project files. Find the root cause systematically. Propose a minimal targeted fix. Never rewrite entire files to fix a bug.`;

export function getStoredMode(): ChatMode {
  if (typeof window === "undefined") return "agent";
  const stored = localStorage.getItem(MODE_STORAGE_KEY);
  if (stored && CHAT_MODES.includes(stored as ChatMode)) return stored as ChatMode;
  return "agent";
}

export function setStoredMode(mode: ChatMode): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(MODE_STORAGE_KEY, mode);
}

export function cycleMode(current: ChatMode): ChatMode {
  const idx = CHAT_MODES.indexOf(current);
  return CHAT_MODES[(idx + 1) % CHAT_MODES.length];
}

export function isValidChatMode(value: string): value is ChatMode {
  return CHAT_MODES.includes(value as ChatMode);
}
