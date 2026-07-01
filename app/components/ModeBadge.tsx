import type { ChatMode } from "@/app/lib/agentTypes";
import { MODE_META } from "@/app/lib/chatModes";

export default function ModeBadge({ mode }: { mode: ChatMode }) {
  const meta = MODE_META[mode];
  return (
    <span
      className={`mb-1.5 inline-block rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${meta.badgeClass}`}
    >
      {meta.label}
    </span>
  );
}
