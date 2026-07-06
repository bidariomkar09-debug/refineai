"use client";

import {
  SandpackPreview as SandpackFrame,
  SandpackProvider,
  useSandpack,
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

function SandpackErrorOverlay() {
  const { sandpack } = useSandpack();
  const error = sandpack.error;

  if (!error) return null;

  return (
    <div
      className="absolute inset-x-0 top-0 z-10 border-b border-red-500/50 bg-red-950/95 px-3 py-2 text-xs text-red-200"
      data-testid="sandpack-error-overlay"
      role="alert"
    >
      <p className="font-semibold text-red-300">Preview compile error</p>
      <p className="mt-1 line-clamp-4 font-mono">{error.message}</p>
    </div>
  );
}

function SandpackFrameWithErrors({
  viewport,
}: {
  viewport: "desktop" | "mobile";
}) {
  return (
    <div className="relative h-full w-full">
      <SandpackErrorOverlay />
      <SandpackFrame
        style={{ height: "100%", minHeight: "100%", width: "100%" }}
        showOpenInCodeSandbox={false}
        showRefreshButton={false}
      />
    </div>
  );
}

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
      className={`relative mx-auto h-full overflow-hidden rounded-lg border border-surface-border bg-white ${
        viewport === "mobile" ? "max-w-[375px]" : "w-full"
      }`}
    >
      <SandpackProvider
        template={sandpackTemplate}
        files={files as SandpackFiles}
        theme="dark"
        customSetup={{
          entry,
          environment: "create-react-app",
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
        <SandpackFrameWithErrors viewport={viewport} />
      </SandpackProvider>
    </div>
  );
}
