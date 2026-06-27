"use client";

type MessageBubbleProps = {
  role: "user" | "assistant";
  content: string;
  children?: React.ReactNode;
  compact?: boolean;
};

export default function MessageBubble({
  role,
  content,
  children,
  compact = false,
}: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} ${compact ? "mb-2" : "mb-4"}`}>
      <div
        className={`max-w-[95%] rounded-xl px-3 py-2 ${
          compact ? "text-xs" : "rounded-2xl px-4 py-3"
        } ${
          isUser
            ? "bg-accent text-white"
            : "border border-surface-border bg-surface text-gray-200"
        }`}
      >
        {!children && (
          <p className={`whitespace-pre-wrap leading-relaxed ${compact ? "text-xs" : "text-sm"}`}>
            {content}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}
