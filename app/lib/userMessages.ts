export const USER_MESSAGES = {
  planning: "Planning your project...",
  building: "Building your app...",
  buildingFile: (name: string) => `Building ${name}...`,
  reviewing: "Reviewing the code...",
  refining: "Making improvements...",
  testing: "Testing the API...",
  fixing: "Fixing a few things...",
  almostDone: "Almost done...",
  complete: "Your project is ready!",
  paused: "Build paused.",
  changesReceived: "Updating your plan...",
  fileStarted: (path: string) => `Building ${path}...`,
  fileComplete: (path: string, score: number) => `Finished ${path} — ${score}%`,
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
