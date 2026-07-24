"use client";

type MessageBubbleProps = {
  role: "user" | "assistant";
  content: string;
  children?: React.ReactNode;
  compact?: boolean;
  mobile?: boolean;
  /** Compact single-line status entry (Cursor-style progress stream) */
  progress?: boolean;
  badge?: React.ReactNode;
};

export default function MessageBubble({
  role,
  content,
  children,
  compact = false,
  mobile = false,
  progress = false,
  badge,
}: MessageBubbleProps) {
  const isUser = role === "user";

  if (progress && !isUser) {
    return (
      <div className={`flex justify-start ${mobile ? "mb-1.5" : "mb-1"}`}>
        <div className="flex max-w-[95%] items-start gap-2 px-1 py-0.5">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400/80" />
          <p className="text-[12px] leading-relaxed text-gray-500">{content}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} ${
        mobile ? "mb-3" : compact ? "mb-2" : "mb-4"
      }`}
    >
      <div
        className={`max-w-[95%] ${
          isUser
            ? `rounded-2xl bg-accent px-3 py-2 text-white ${
                mobile ? "text-sm" : compact ? "text-xs" : "rounded-2xl px-4 py-3 text-sm"
              }`
            : mobile
              ? "px-1 py-0.5 text-sm text-gray-200"
              : compact
                ? "rounded-xl border border-surface-border bg-surface px-3 py-2 text-xs text-gray-200"
                : "rounded-2xl border border-surface-border bg-surface px-4 py-3 text-sm text-gray-200"
        }`}
      >
        {!isUser && badge}
        <p
          className={`whitespace-pre-wrap leading-relaxed ${
            mobile ? "text-sm" : compact ? "text-xs" : "text-sm"
          }`}
        >
          {content}
        </p>
        {children}
      </div>
    </div>
  );
}
