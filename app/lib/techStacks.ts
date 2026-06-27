import type { TechStack } from "./agentTypes";

export const DEFAULT_STACK: TechStack = {
  frontend: "Next.js 14",
  backend: "Next.js API Routes",
  database: "Supabase",
  ai: "OpenAI GPT-4o",
  styling: "Tailwind CSS",
  deploy: "Vercel",
};

export const NICHE_HINTS: Record<string, Partial<TechStack>> = {
  healthcare: { ...DEFAULT_STACK, database: "Supabase" },
  ecommerce: { frontend: "Next.js 14", backend: "Next.js API Routes" },
  saas: DEFAULT_STACK,
  dashboard: DEFAULT_STACK,
  landing: {
    frontend: "Next.js 14",
    backend: "None",
    database: "None",
    ai: "None",
    styling: "Tailwind CSS",
    deploy: "Vercel",
  },
};

export function detectNiche(idea: string): string {
  const lower = idea.toLowerCase();
  if (/health|patient|doctor|medical|appointment|clinic/.test(lower))
    return "healthcare";
  if (/shop|store|ecommerce|cart|product/.test(lower)) return "ecommerce";
  if (/dashboard|analytics|admin/.test(lower)) return "dashboard";
  if (/landing|marketing|portfolio/.test(lower)) return "landing";
  if (/saas|subscription|platform/.test(lower)) return "saas";
  return "general";
}

export function getStackForNiche(niche: string): TechStack {
  return { ...DEFAULT_STACK, ...(NICHE_HINTS[niche] ?? {}) };
}
