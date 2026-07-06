export const USER_MESSAGES = {
  planning: "Planning your project...",
  building: "Getting started on your app...",
  buildingFile: (name: string) => `Working on ${name}...`,
  reviewing: "Reviewing everything looks good...",
  refining: "Polishing a few details...",
  testing: "Running a quick check...",
  fixing: "Fixing a few things...",
  almostDone: "Almost there...",
  verifyingPreview: "Verifying preview compiles...",
  previewVerified: "Preview verified — your app runs!",
  complete: "Your project is ready!",
  paused: "Build paused.",
  changesReceived: "Updating your plan...",
  fileStarted: (message: string) => message,
  fileComplete: (message: string) => message,
  startingApp: "Starting your app...",
  installingDeps: "Installing dependencies...",
  previewReady: "Your app is running!",
  previewError: "Fixing a few things...",
  qualityTarget: "Target: 95%+ quality",
  makeChangesPrompt: "Sure! What would you like to change?",
  revisionFallback: "I've updated the plan based on your feedback — here's what changed:",
  planningEmpty: "Describe your app idea in the chat panel on the right.",
} as const;

export function getFileStatusMessage(task: "write" | "review" | "refine"): string {
  switch (task) {
    case "write":
      return "Writing the code...";
    case "review":
      return USER_MESSAGES.reviewing;
    case "refine":
      return USER_MESSAGES.refining;
  }
}

export function completionMessage(
  name: string,
  fileCount: number,
  avgScore: number
): string {
  const scorePart =
    avgScore > 0
      ? ` I built ${fileCount} file${fileCount === 1 ? "" : "s"} with an average quality score of ${avgScore}%.`
      : ` I built ${fileCount} file${fileCount === 1 ? "" : "s"}.`;
  return `Your ${name} is ready! 🎉${scorePart} Here's how to run it...`;
}

export function fileCompleteMessage(friendlyName: string, score: number): string {
  return `Finished ${friendlyName} — looking great at ${score}%!`;
}
