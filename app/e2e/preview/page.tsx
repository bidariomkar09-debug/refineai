"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { buildSandpackFiles } from "@/app/lib/previewSandpack";
import { landingPageProjectFiles } from "@/app/e2e/fixtures/landingPage";

const SandpackPreviewPanel = dynamic(
  () => import("@/app/components/SandpackPreview"),
  { ssr: false }
);

export default function E2EPreviewPage() {
  const bundle = useMemo(
    () => buildSandpackFiles(landingPageProjectFiles),
    []
  );

  if (!bundle) {
    return (
      <div data-testid="e2e-preview-error" className="p-8 text-red-400">
        Failed to build Sandpack preview bundle.
      </div>
    );
  }

  return (
    <div
      data-testid="e2e-preview-root"
      className="flex h-screen flex-col bg-[#0d0d0d]"
    >
      <header className="shrink-0 border-b border-white/10 px-4 py-2 text-sm text-gray-400">
        RefineAI · E2E preview harness
      </header>
      <div className="min-h-0 flex-1 p-2">
        <SandpackPreviewPanel
          files={bundle.files}
          template={bundle.template}
          entry={bundle.entry}
          dependencies={bundle.dependencies}
          viewport="desktop"
        />
      </div>
    </div>
  );
}
