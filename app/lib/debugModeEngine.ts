import type { DbFile, DebugProposal } from "./agentTypes";
import { DEBUG_SYSTEM_PROMPT } from "./chatModes";
import { generateJSON } from "./agentAI";

export async function analyzeBug(params: {
  message: string;
  files: DbFile[];
}): Promise<{ content: string; proposal: DebugProposal }> {
  const doneFiles = params.files.filter((f) => f.status === "done" && f.content);
  if (doneFiles.length === 0) {
    throw new Error("No built files to analyze");
  }

  const fileContext = doneFiles
    .map(
      (f, i) =>
        `--- FILE ${i + 1}: ${f.file_path} (id: ${f.id}) ---\n${f.content?.slice(0, 4000)}`
    )
    .join("\n\n");

  const { data } = await generateJSON<{
    analysis: string;
    rootCause: string;
    filePath: string;
    fixedContent: string;
    debugSnippet?: string;
  }>(
    `${DEBUG_SYSTEM_PROMPT}

Respond with JSON:
{
  "analysis": "step-by-step analysis shown to user",
  "rootCause": "one sentence root cause",
  "filePath": "exact file path from context",
  "fixedContent": "full corrected file content with minimal fix applied",
  "debugSnippet": "optional temporary console.log lines added"
}`,
    `Bug report:\n${params.message}\n\nProject files:\n${fileContext}`
  );

  const target = doneFiles.find((f) => f.file_path === data.filePath) ?? doneFiles[0];

  const proposal: DebugProposal = {
    analysis: data.analysis,
    rootCause: data.rootCause,
    fileId: target.id,
    filePath: target.file_path,
    fixedContent: data.fixedContent,
    debugSnippet: data.debugSnippet,
  };

  const content = `${data.analysis}\n\n**Root cause:** ${data.rootCause}\n\n**File:** \`${target.file_path}\``;
  return { content, proposal };
}
