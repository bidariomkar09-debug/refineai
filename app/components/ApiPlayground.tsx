"use client";

import { useState } from "react";
import type { ApiCallSnapshot } from "@/app/lib/types";

type ApiPlaygroundProps = {
  apiCall: ApiCallSnapshot | null;
};

export default function ApiPlayground({ apiCall }: ApiPlaygroundProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!apiCall) {
    return (
      <p className="text-xs text-gray-500">
        API calls will appear here during the loop.
      </p>
    );
  }

  const payload = {
    model: apiCall.model,
    temperature: apiCall.temperature,
    response_format: apiCall.jsonMode ? { type: "json_object" } : undefined,
    messages: apiCall.messages,
  };

  const code = JSON.stringify(payload, null, 2);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="rounded-lg border border-surface-border bg-surface">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-medium text-gray-300 hover:text-white"
      >
        <span>
          Round {apiCall.round} — {apiCall.task} API call
        </span>
        <span className="text-gray-500">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="border-t border-surface-border p-2">
          <div className="mb-2 flex justify-end">
            <button
              type="button"
              onClick={handleCopy}
              className="rounded px-2 py-1 text-[10px] font-medium text-accent hover:bg-accent/10"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <pre className="max-h-48 overflow-auto rounded bg-black/40 p-2 text-[10px] leading-relaxed text-green-400">
            {code}
          </pre>
        </div>
      )}
    </div>
  );
}
