import type {
  ClarifyingQuestion,
  ProjectClarifications,
  ProjectPlan,
  VisualPlanArtifacts,
} from "./agentTypes";
import { generateText } from "./agentAI";
import { detectNiche } from "./techStacks";

const BASE_QUESTIONS: Omit<ClarifyingQuestion, "options">[] = [
  { id: "ui_style", question: "What UI style do you prefer?", default: "Dark theme" },
  {
    id: "data_persistence",
    question: "How should data be stored?",
    default: "Saves all data",
  },
  {
    id: "ai_model",
    question: "Which AI model should power smart features?",
    default: "GPT-4o",
  },
  {
    id: "device_focus",
    question: "What device should we optimize for?",
    default: "Both desktop and mobile",
  },
  { id: "key_features", question: "Which features matter most?", default: "" },
];

const NICHE_FEATURE_OPTIONS: Record<string, string[]> = {
  ai_assistant: [
    "Chat with AI",
    "Task management",
    "Habit tracking",
    "Reminders",
    "Notes & journaling",
  ],
  todo: [
    "Task lists",
    "Due dates & reminders",
    "Categories & tags",
    "Progress tracking",
    "Collaboration",
  ],
  portfolio: [
    "Project showcase",
    "About & bio section",
    "Contact form",
    "Blog or writing",
    "Skills & resume",
  ],
  saas: [
    "User accounts",
    "Dashboard analytics",
    "Billing & subscriptions",
    "Team collaboration",
    "Admin panel",
  ],
  general: [
    "Core dashboard",
    "User settings",
    "Data export",
    "Search & filters",
    "Notifications",
  ],
};

function detectProjectType(target: string): string {
  const lower = target.toLowerCase();
  if (/ai|assistant|chatbot|copilot|gpt/.test(lower)) return "ai_assistant";
  if (/todo|task|checklist|productivity/.test(lower)) return "todo";
  if (/portfolio|resume|personal site|showcase/.test(lower)) return "portfolio";
  if (/saas|subscription|platform|startup/.test(lower)) return "saas";
  return "general";
}

export function generateClarifyingQuestions(
  target: string,
  niche?: string
): ClarifyingQuestion[] {
  const projectType = detectProjectType(target);
  const featureOptions = NICHE_FEATURE_OPTIONS[projectType] ?? NICHE_FEATURE_OPTIONS.general;

  return [
    {
      ...BASE_QUESTIONS[0],
      options: ["Dark theme", "Light theme", "Auto (system preference)"],
    },
    {
      ...BASE_QUESTIONS[1],
      options: ["Saves all data", "Session only", "No persistence needed"],
    },
    {
      ...BASE_QUESTIONS[2],
      options: ["GPT-4o", "GPT-4o mini", "No AI needed"],
    },
    {
      ...BASE_QUESTIONS[3],
      options: ["Desktop first", "Mobile first", "Both desktop and mobile"],
    },
    {
      id: "key_features",
      question: `Which features matter most for your ${niche || projectType.replace("_", " ")}?`,
      options: featureOptions,
      default: featureOptions[0],
    },
  ];
}

export function areClarificationsComplete(
  questions: ClarifyingQuestion[],
  clarifications: ProjectClarifications
): boolean {
  return questions.every((q) => Boolean(clarifications[q.id]?.trim()));
}

export function formatClarificationsForPrompt(
  clarifications: ProjectClarifications
): string {
  const labels: Record<string, string> = {
    ui_style: "UI Style",
    data_persistence: "Data Persistence",
    ai_model: "Primary AI Model",
    device_focus: "Device Focus",
    key_features: "Key Features",
  };
  const lines = Object.entries(clarifications)
    .filter(([, v]) => v?.trim())
    .map(([key, value]) => `- ${labels[key] ?? key}: ${value}`);
  if (lines.length === 0) return "";
  return `The user has clarified their project as follows:\n${lines.join("\n")}`;
}

export function formatClarificationPrefs(
  clarifications: ProjectClarifications
): string[] {
  return Object.values(clarifications).filter(Boolean);
}

export function generateFlowchart(
  plan: ProjectPlan,
  clarifications: ProjectClarifications
): string {
  const frontend = plan.techStack?.frontend || "Next.js";
  const backend = plan.techStack?.backend || "API Routes";
  const database = plan.techStack?.database || "Supabase";
  const ai = plan.techStack?.ai || clarifications.ai_model || "OpenAI";
  const hasAi = clarifications.ai_model !== "No AI needed" && ai !== "None";

  const lines = [
    "┌─────────────────────────────────────────────────┐",
    "│              ARCHITECTURE OVERVIEW              │",
    "└─────────────────────────────────────────────────┘",
    "",
    "  ┌──────────────┐",
    `  │   Frontend   │  ${frontend}`,
    "  │  (User UI)   │",
    "  └──────┬───────┘",
    "         │",
    "         ▼",
    "  ┌──────────────┐",
    `  │     API      │  ${backend}`,
    "  │  (Backend)   │",
    "  └──────┬───────┘",
  ];

  if (hasAi) {
    lines.push("         │");
    lines.push("    ┌────┴────┐");
    lines.push("    ▼         ▼");
    lines.push("  ┌──────┐  ┌──────┐");
    lines.push(`  │  DB  │  │  AI  │  ${database} / ${ai}`);
    lines.push("  └──────┘  └──────┘");
  } else {
    lines.push("         │");
    lines.push("         ▼");
    lines.push("  ┌──────────────┐");
    lines.push(`  │   Database   │  ${database}`);
    lines.push("  └──────────────┘");
  }

  return lines.join("\n");
}

function humanizeStepLabel(label: string): string {
  return label
    .replace(/\.tsx?$/i, "")
    .replace(/\/api\//gi, "API: ")
    .replace(/_/g, " ")
    .trim();
}

export function generateBuildPreview(
  plan: ProjectPlan,
  clarifications: ProjectClarifications,
  target: string
): Omit<VisualPlanArtifacts, "plainEnglish"> {
  const headline = plan.name || target.slice(0, 60);
  const keyFeature = clarifications.key_features || "core features";
  const uiStyle = clarifications.ui_style || "modern";
  const persistence =
    clarifications.data_persistence === "Saves all data"
      ? "with persistent storage"
      : clarifications.data_persistence === "Session only"
        ? "with session-based storage"
        : "without persistent storage";

  const outcomeBullets = [
    clarifications.key_features
      ? `Use ${keyFeature.toLowerCase()} as the main focus`
      : `A working ${plan.niche || "web"} application`,
    clarifications.ai_model && clarifications.ai_model !== "No AI needed"
      ? `Powered by ${clarifications.ai_model} for smart features`
      : "Clean, fast user interface",
    `${uiStyle} design optimized for ${(clarifications.device_focus || "all devices").toLowerCase()}`,
    persistence.charAt(0).toUpperCase() + persistence.slice(1),
  ].filter(Boolean);

  const deliverables =
    plan.steps?.map((s) => humanizeStepLabel(s.label)).filter(Boolean) ??
    plan.files
      ?.slice(0, 6)
      .map((f) => f.purpose || humanizeStepLabel(f.name))
      .filter(Boolean) ??
    ["Main dashboard", "Backend API routes", "Database schema"];

  const fileCount = plan.files?.length ?? plan.estimatedFiles ?? 8;
  const buildSteps = [
    `Generate ~${fileCount} source files based on your plan`,
    "Verify each file for syntax and runtime correctness",
    "Apply your preferences (theme, features, AI model)",
    "Open a live preview when the build completes",
  ];

  const flowchart = generateFlowchart(plan, clarifications);

  return {
    headline,
    outcomeBullets: outcomeBullets.slice(0, 5),
    deliverables: deliverables.slice(0, 8),
    buildSteps,
    flowchart,
    clarifications,
  };
}

export async function generatePlainEnglish(
  target: string,
  plan: ProjectPlan,
  clarifications: ProjectClarifications,
  preview: Omit<VisualPlanArtifacts, "plainEnglish">
): Promise<string> {
  const template = buildPlainEnglishTemplate(target, plan, clarifications, preview);

  if (!process.env.OPENAI_API_KEY?.trim()) {
    return template;
  }

  try {
    const { content } = await generateText(
      `Write 4-6 sentences in plain, non-technical English describing what will be built.
Do NOT mention file paths, .tsx, /api/, or code. Write as if explaining to a friend.
Incorporate the user's preferences naturally.`,
      `Project idea: ${target}
App name: ${preview.headline}
Features: ${preview.outcomeBullets.join("; ")}
User preferences: ${formatClarificationsForPrompt(clarifications)}
Draft: ${template}`
    );
    const cleaned = content.trim();
    if (cleaned.length > 40 && !/\.tsx|\/api\//i.test(cleaned)) {
      return cleaned;
    }
  } catch {
    /* fall through to template */
  }

  return template;
}

function buildPlainEnglishTemplate(
  target: string,
  plan: ProjectPlan,
  clarifications: ProjectClarifications,
  preview: Omit<VisualPlanArtifacts, "plainEnglish">
): string {
  const ui = (clarifications.ui_style || "modern").toLowerCase();
  const feature = clarifications.key_features || preview.outcomeBullets[0] || "your core features";
  const device = (clarifications.device_focus || "all devices").toLowerCase();
  const persistence =
    clarifications.data_persistence === "Saves all data"
      ? "Everything saves automatically so you never lose progress."
      : clarifications.data_persistence === "Session only"
        ? "Your data persists during your session."
        : "";
  const ai =
    clarifications.ai_model && clarifications.ai_model !== "No AI needed"
      ? `Smart features are powered by ${clarifications.ai_model}.`
      : "";

  return [
    `I'm building ${preview.headline} — ${plan.description || target}.`,
    `You'll get ${feature.toLowerCase()} with a clean ${ui} interface.`,
    `The app works great on ${device}.`,
    persistence,
    ai,
    `RefineAI will create ${preview.deliverables.length} main components and verify everything before showing you a live preview.`,
  ]
    .filter(Boolean)
    .join(" ");
}

export async function buildVisualPlanArtifacts(
  plan: ProjectPlan,
  clarifications: ProjectClarifications,
  target: string
): Promise<VisualPlanArtifacts> {
  const preview = generateBuildPreview(plan, clarifications, target);
  const plainEnglish = await generatePlainEnglish(target, plan, clarifications, preview);
  return { ...preview, plainEnglish };
}

export function mergeClarificationAnswers(
  existing: ProjectClarifications,
  answers: { id: string; value: string }[]
): ProjectClarifications {
  const merged = { ...existing };
  for (const { id, value } of answers) {
    if (value?.trim()) merged[id] = value.trim();
  }
  return merged;
}

export function getDefaultClarifications(
  questions: ClarifyingQuestion[]
): ProjectClarifications {
  const defaults: ProjectClarifications = {};
  for (const q of questions) {
    if (q.default) defaults[q.id] = q.default;
  }
  return defaults;
}
