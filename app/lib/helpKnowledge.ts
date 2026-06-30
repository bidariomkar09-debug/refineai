export const HELP_KNOWLEDGE_BASE = [
  {
    keywords: ["loop", "refine", "how does", "work"],
    answer:
      "RefineAI runs a generate → critique → refine loop until your code reaches 95%+ quality. Each round saves training data automatically for fine-tuning LoopModel.",
    confidence: 0.95,
  },
  {
    keywords: ["fine-tun", "train", "loopmodel", "custom model"],
    answer:
      "Go to Training Data → Clean & Prepare Dataset → Fine-Tuning Manager to upload JSONL and start a job. The Training Pipeline can automate retraining weekly.",
    confidence: 0.92,
  },
  {
    keywords: ["api", "loopmodel api", "developer", "lm_live"],
    answer:
      "LoopModel API lets developers call POST /api/v1/loop/refine with a Bearer lm_live_… key. Create keys on the LoopModel API page. Long jobs return a job_id for polling.",
    confidence: 0.93,
  },
  {
    keywords: ["rate limit", "429", "too many"],
    answer:
      "Free tier: 10 requests/minute. Pro: 60/minute. Enterprise: unlimited. Check Retry-After header when you receive 429.",
    confidence: 0.9,
  },
  {
    keywords: ["export", "llama", "hugging", "dataset"],
    answer:
      "On Training Data, run Clean & Prepare, then Export for Llama Fine Tuning (Alpaca JSONL) or Export OpenAI JSONL for fine-tuning.",
    confidence: 0.88,
  },
  {
    keywords: ["rollback", "emergency", "production"],
    answer:
      "Model Monitor has an Emergency Rollback button that instantly disables your custom model and sets rollout to 0%.",
    confidence: 0.91,
  },
  {
    keywords: ["pricing", "cost", "subscribe", "plan"],
    answer:
      "RefineAI subscribers use the builder UI. LoopModel API is billed at $0.002 per 1k tokens. Developer plans: free, pro, and enterprise tiers.",
    confidence: 0.85,
  },
  {
    keywords: ["status", "down", "uptime", "incident"],
    answer:
      "Visit /status for API uptime, current system health, and incident history. Subscribe for email updates on outages.",
    confidence: 0.9,
  },
];

export type HelpChatResult = {
  answer: string;
  confidence: number;
  escalated: boolean;
  sources: string[];
};

export function answerFromKnowledgeBase(question: string): HelpChatResult {
  const q = question.toLowerCase();
  let best: (typeof HELP_KNOWLEDGE_BASE)[0] | null = null;
  let bestScore = 0;

  for (const entry of HELP_KNOWLEDGE_BASE) {
    const score = entry.keywords.filter((k) => q.includes(k)).length;
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }

  if (best && bestScore > 0) {
    return {
      answer: best.answer,
      confidence: best.confidence,
      escalated: false,
      sources: best.keywords,
    };
  }

  return {
    answer:
      "I'm not confident I have the right answer. I've escalated this to human support — we'll follow up at support@refineai.app within 24 hours.",
    confidence: 0.3,
    escalated: true,
    sources: [],
  };
}
