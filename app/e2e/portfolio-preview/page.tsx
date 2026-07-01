"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { buildSandpackFiles } from "@/app/lib/previewSandpack";
import { portfolioPreviewFiles } from "@/app/e2e/fixtures/portfolioPreviewFixture";

const SandpackPreviewPanel = dynamic(
  () => import("@/app/components/SandpackPreview"),
  { ssr: false }
);

export default function PortfolioE2EPreviewPage() {
  const bundle = useMemo(
    () => buildSandpackFiles(portfolioPreviewFiles),
    []
  );

  if (!bundle) {
    return <div data-testid="e2e-preview-error">Failed to build bundle</div>;
  }

  return (
    <div data-testid="e2e-preview-root" className="h-screen bg-[#0d0d0d] p-2">
      <SandpackPreviewPanel
        files={bundle.files}
        template={bundle.template}
        entry={bundle.entry}
        dependencies={bundle.dependencies}
        viewport="desktop"
      />
    </div>
  );
}
