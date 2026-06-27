export type AppMode = "simple" | "developer";

export type ModelId = "gpt-4o" | "gpt-4o-mini" | "gpt-3.5-turbo";

export type DeveloperConfig = {
  systemPrompt: string;
  model: ModelId;
  scoreThreshold: number;
  maxRounds: number;
  temperature: number;
  jsonMode: boolean;
};

export const DEFAULT_SYSTEM_PROMPT = `You are a loop refining AI. Generate, critique, and refine output until it perfectly matches the user target. Score yourself 0-100 each round.`;

export const DEFAULT_DEV_CONFIG: DeveloperConfig = {
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  model: "gpt-4o",
  scoreThreshold: 90,
  maxRounds: 12,
  temperature: 0.7,
  jsonMode: false,
};

export const TARGET_SCORE = DEFAULT_DEV_CONFIG.scoreThreshold;
export const MAX_ROUNDS = DEFAULT_DEV_CONFIG.maxRounds;

export const MODEL_OPTIONS: { value: ModelId; label: string; hint: string }[] = [
  { value: "gpt-4o", label: "gpt-4o", hint: "Recommended" },
  { value: "gpt-4o-mini", label: "gpt-4o-mini", hint: "Faster, cheaper" },
  { value: "gpt-3.5-turbo", label: "gpt-3.5-turbo", hint: "Fastest, cheapest" },
];

export const APP_MODE_KEY = "refineai-app-mode";
export const DEV_CONFIG_KEY = "refineai-dev-config";
export const DEV_PANEL_COLLAPSED_KEY = "refineai-dev-panel-collapsed";

export function getActiveConfig(
  appMode: AppMode,
  devConfig: DeveloperConfig
): DeveloperConfig {
  return appMode === "simple" ? DEFAULT_DEV_CONFIG : devConfig;
}
