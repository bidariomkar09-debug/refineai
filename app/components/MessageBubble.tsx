"use client";

type MessageBubbleProps = {
  role: "user" | "assistant";
  content: string;
  children?: React.ReactNode;
};

export default function MessageBubble({
  role,
  content,
  children,
}: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-accent text-white"
            : "border border-surface-border bg-surface-raised text-gray-200"
        }`}
      >
        {!children && (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{content}</p>
        )}
        {children}
      </div>
    </div>
  );
}
