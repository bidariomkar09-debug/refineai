import { ASK_SYSTEM_PROMPT } from "./chatModes";
import { generateText } from "./agentAI";
import {
  getCompletedFilesContext,
  getMessages,
  getProject,
} from "./db";

type HistoryMessage = { role: "user" | "assistant"; content: string };

export async function answerQuestion(params: {
  message: string;
  projectId?: string;
  history?: HistoryMessage[];
}): Promise<string> {
  const parts: string[] = [];

  if (params.projectId) {
    const project = await getProject(params.projectId);
    if (project) {
      parts.push(
        `[Project: ${project.name}]\n${project.description}`,
        `[Project files context]\n${await getCompletedFilesContext(params.projectId)}`
      );
    }
  }

  const history =
    params.history ??
    (params.projectId
      ? (await getMessages(params.projectId))
          .filter((m) => m.type === "chat")
          .slice(-10)
          .map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          }))
      : []);

  const conversation = history
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n\n");

  const userPrompt = [
    ...parts,
    conversation ? `[Conversation]\n${conversation}` : "",
    `[Current question]\n${params.message}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const { content } = await generateText(ASK_SYSTEM_PROMPT, userPrompt);
  return content;
}
