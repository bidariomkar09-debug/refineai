"use client";

import type { DebugProposal } from "@/app/lib/agentTypes";

type DebugFixActionsProps = {
  proposal: DebugProposal;
  onApply: (proposal: DebugProposal) => void;
  disabled?: boolean;
  applied?: boolean;
};

export default function DebugFixActions({
  proposal,
  onApply,
  disabled,
  applied,
}: DebugFixActionsProps) {
  if (applied) {
    return (
      <p className="mt-2 text-xs text-emerald-400">Fix applied to {proposal.filePath}</p>
    );
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => onApply(proposal)}
        disabled={disabled}
        className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-500 disabled:opacity-50"
      >
        Apply Fix
      </button>
    </div>
  );
}
