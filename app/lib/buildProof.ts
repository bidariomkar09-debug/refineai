import { formatElapsed } from "./loopEngineeringState";

export type BuildProofInput = {
  prompt: string;
  projectName: string;
  elapsedMs: number;
  fileCount: number;
  avgScore: number;
  previewVerified: boolean;
};

function truncatePrompt(prompt: string, maxLen = 200): string {
  const trimmed = prompt.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen - 1)}…`;
}

export function formatBuildProof(input: BuildProofInput): {
  tweetText: string;
  clipboardText: string;
} {
  const elapsed = formatElapsed(input.elapsedMs);
  const prompt = truncatePrompt(input.prompt);
  const stats = [
    `${input.fileCount} file${input.fileCount === 1 ? "" : "s"}`,
    `${input.avgScore}% avg`,
    input.previewVerified ? "preview verified" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const clipboardText = [
    `I described: "${prompt}"`,
    "",
    `Got this in ${elapsed} with RefineAI`,
    "",
    stats,
    "",
    `Project: ${input.projectName}`,
  ].join("\n");

  const tweetText = [
    `I described: "${prompt}"`,
    "",
    `Got this in ${elapsed} with RefineAI`,
    "",
    stats,
  ].join("\n");

  return { tweetText, clipboardText };
}

export function twitterIntentUrl(text: string): string {
  const params = new URLSearchParams({ text });
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}
