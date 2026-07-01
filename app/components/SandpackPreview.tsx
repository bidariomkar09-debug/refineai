"use client";

import {
  SandpackPreview as SandpackFrame,
  SandpackProvider,
  type SandpackPredefinedTemplate,
} from "@codesandbox/sandpack-react";
import type { SandpackTemplate } from "@/app/lib/previewSandpack";

type SandpackPreviewProps = {
  files: Record<string, string>;
  template: SandpackTemplate;
  viewport: "desktop" | "mobile";
};

export default function SandpackPreviewPanel({
  files,
  template,
  viewport,
}: SandpackPreviewProps) {
  const sandpackTemplate: SandpackPredefinedTemplate =
    template === "nextjs" ? "nextjs" : "react";

  return (
    <div
      className={`mx-auto h-full overflow-hidden rounded-lg border border-surface-border bg-white ${
        viewport === "mobile" ? "max-w-[375px]" : "w-full"
      }`}
    >
      <SandpackProvider
        template={sandpackTemplate}
        files={files}
        theme="dark"
        options={{
          externalResources: ["https://cdn.tailwindcss.com"],
          recompileMode: "immediate",
          recompileDelay: 300,
        }}
      >
        <SandpackFrame
          style={{ height: "100%", minHeight: "100%", width: "100%" }}
          showOpenInCodeSandbox={false}
          showRefreshButton={false}
        />
      </SandpackProvider>
    </div>
  );
}
