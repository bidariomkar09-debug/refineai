import { OpenAIClientError } from "./openaiClient";
import { DbError } from "./db";
import { ProviderError } from "./modelProviders";

const KEY_PATTERN = /sk-[a-zA-Z0-9_-]{8,}/g;

function redactSecrets(text: string): string {
  return text.replace(KEY_PATTERN, "sk-…");
}

export function apiErrorMessage(err: unknown): string {
  if (err instanceof DbError) {
    if (err.message.includes("does not exist")) {
      return "Database setup incomplete. Run the Supabase migrations, then try again.";
    }
    return redactSecrets(err.message);
  }

  const raw = err instanceof Error ? err.message : String(err ?? "");
  const message = redactSecrets(raw);

  if (
    err instanceof OpenAIClientError ||
    err instanceof ProviderError ||
    message.includes("OPENAI_API_KEY")
  ) {
    if (message.includes("OPENAI_API_KEY is not configured") || !message.trim()) {
      return "OpenAI API key is not configured. Add OPENAI_API_KEY in Vercel → Settings → Environment Variables, then redeploy.";
    }
  }

  if (
    message.includes("401") ||
    message.toLowerCase().includes("incorrect api key") ||
    message.toLowerCase().includes("invalid api key")
  ) {
    return "OpenAI API key is invalid or expired. Update OPENAI_API_KEY in Vercel → Settings → Environment Variables, then redeploy.";
  }

  if (message.includes("429") || message.toLowerCase().includes("rate limit")) {
    return "OpenAI rate limit reached. Wait a moment and try again.";
  }

  if (message.includes("insufficient_quota") || message.toLowerCase().includes("quota")) {
    return "OpenAI account has no remaining quota. Check billing at platform.openai.com.";
  }

  if (message) return message;
  return "Something went wrong. Please try again.";
}
