"use client";

import type { ReactNode } from "react";

type PlanDocumentProps = {
  markdown: string;
};

function renderLine(line: string, key: number) {
  const trimmed = line.trim();
  if (!trimmed) return <div key={key} className="h-2" />;

  if (trimmed.startsWith("### ")) {
    return (
      <h3 key={key} className="mb-2 mt-4 text-sm font-semibold text-white">
        {trimmed.slice(4)}
      </h3>
    );
  }
  if (trimmed.startsWith("## ")) {
    return (
      <h2 key={key} className="mb-2 mt-5 text-base font-semibold text-white">
        {trimmed.slice(3)}
      </h2>
    );
  }
  if (trimmed.startsWith("# ")) {
    return (
      <h1 key={key} className="mb-3 text-lg font-bold text-white">
        {trimmed.slice(2)}
      </h1>
    );
  }
  if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
    return (
      <li key={key} className="ml-4 list-disc text-sm leading-relaxed text-gray-300">
        {formatInline(trimmed.slice(2))}
      </li>
    );
  }
  const numbered = trimmed.match(/^(\d+)\.\s+(.+)/);
  if (numbered) {
    return (
      <li key={key} className="ml-4 list-decimal text-sm leading-relaxed text-gray-300">
        {formatInline(numbered[2])}
      </li>
    );
  }

  return (
    <p key={key} className="text-sm leading-relaxed text-gray-300">
      {formatInline(trimmed)}
    </p>
  );
}

function formatInline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

export default function PlanDocument({ markdown }: PlanDocumentProps) {
  const lines = markdown.split("\n");

  return (
    <div className="overflow-hidden rounded-xl border border-surface-border bg-surface-raised shadow-lg shadow-black/20">
      <div className="border-b border-surface-border bg-surface px-4 py-2.5">
        <p className="text-xs font-medium text-gray-400">PLAN.md</p>
      </div>
      <div className="max-h-[calc(100vh-16rem)] overflow-y-auto px-5 py-5">
        <div className="prose-invert space-y-1">
          {lines.map((line, i) => renderLine(line, i))}
        </div>
      </div>
    </div>
  );
}
