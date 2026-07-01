"use client";

import {
  SandpackPreview as SandpackFrame,
  SandpackProvider,
  type SandpackFiles,
  type SandpackPredefinedTemplate,
} from "@codesandbox/sandpack-react";
import type { SandpackTemplate } from "@/app/lib/previewSandpack";

type SandpackPreviewProps = {
  files: Record<string, string | false>;
  template: SandpackTemplate;
  viewport: "desktop" | "mobile";
  entry?: string;
  dependencies?: Record<string, string>;
};

export default function SandpackPreviewPanel({
  files,
  template,
  viewport,
  entry = "/index.js",
  dependencies,
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
        files={files as SandpackFiles}
        theme="dark"
        customSetup={{
          entry,
          dependencies: dependencies ?? {
            react: "^18.2.0",
            "react-dom": "^18.2.0",
          },
        }}
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
