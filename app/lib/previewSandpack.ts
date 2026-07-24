import type { DbFile } from "./agentTypes";
import {
  ensureMissingAssetImports,
  ensureMissingStyleImports,
  rewriteAliasImports,
} from "./previewAssetStubs";
import { collectSandpackDependencies } from "./sandpackDependencies";
import { wireAppEntry } from "./wireAppEntry";

export type SandpackTemplate = "react" | "nextjs";

const SKIP_FILES = new Set(["plan.md", "readme.md"]);

function normalizeSandpackPath(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/");
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

function usesTailwind(files: Record<string, string>): boolean {
  return Object.values(files).some(
    (content) =>
      content.includes("tailwindcss") ||
      content.includes("@tailwind") ||
      /\bclassName=["'][^"']*\b(flex|grid|bg-|text-|p-|m-|rounded|hover:)/.test(content)
  );
}

function getSandpackEntry(files: Record<string, string>): string {
  // Prefer root entry — Sandpack CRA template boots from /index.js
  if (files["/index.js"]) return "/index.js";
  if (files["/index.tsx"]) return "/index.tsx";
  if (files["/src/index.js"]) return "/src/index.js";
  if (files["/src/index.tsx"]) return "/src/index.tsx";
  return "/index.js";
}

/** Sandpack merges template defaults; remove them so user files render instead of "Hello world". */
function stripSandpackTemplateDefaults(
  files: Record<string, string>
): Record<string, string | false> {
  const result: Record<string, string | false> = { ...files };
  const paths = Object.keys(files);

  const hasSrcApp = paths.some((p) => /\/src\/App\.(jsx?|tsx?)$/i.test(p));
  const hasRootIndex = Boolean(files["/index.js"] || files["/index.tsx"]);

  // Hide template App.* when the real app lives under /src
  if (hasSrcApp) {
    if (!files["/App.js"]) result["/App.js"] = false;
    if (!files["/App.tsx"]) result["/App.tsx"] = false;
  }

  // Hide unused style defaults
  if (!files["/styles.css"] && paths.some((p) => p.endsWith(".css"))) {
    result["/styles.css"] = false;
  }
  if (!files["/styles.module.css"]) {
    result["/styles.module.css"] = false;
  }
  if (!files["/index.css"] && (files["/src/index.css"] || paths.some((p) => p.endsWith(".css")))) {
    result["/index.css"] = false;
  }

  // Never hide /index.js when we don't have a root entry — Sandpack CRA needs it.
  // Only hide template /index.tsx when we already ship /index.js.
  if (hasRootIndex && !files["/index.tsx"]) {
    result["/index.tsx"] = false;
  }

  return result;
}

function collectSandpackDependenciesFromFiles(
  files: Record<string, string>
): Record<string, string> {
  return collectSandpackDependencies(files);
}

function preparePreviewFiles(files: Record<string, string>): Record<string, string> {
  const wired = wireAppEntry(files);
  const aliased = rewriteAliasImports(wired);
  const withAssets = ensureMissingAssetImports(ensureMissingStyleImports(aliased));
  return withAssets;
}

function detectTemplate(files: Record<string, string>): SandpackTemplate {
  const paths = Object.keys(files);
  if (
    paths.some(
      (p) =>
        p.includes("/app/page.") ||
        p.includes("/app/layout.") ||
        p.startsWith("/app/")
    )
  ) {
    return "nextjs";
  }
  return "react";
}

function ensureReactScaffold(files: Record<string, string>): Record<string, string> {
  const result = { ...files };
  const tailwind = usesTailwind(result);

  const appPath =
    Object.keys(result).find((p) => /\/App\.(jsx?|tsx?)$/.test(p)) ??
    Object.keys(result).find((p) => /\/app\.(jsx?|tsx?)$/i.test(p));

  // Sandpack CRA requires a ROOT /index.js — /src/index.js alone is not enough.
  const rootIndexPath = Object.keys(result).find((p) =>
    /^\/index\.(jsx?|tsx?)$/.test(p)
  );

  if (appPath && !rootIndexPath) {
    const appBase = appPath.split("/").pop()?.replace(/\.[^.]+$/, "") ?? "App";
    const importPath = appPath.startsWith("/src/")
      ? `./src/${appBase}`
      : appPath.includes("/")
        ? `./${appPath.split("/").slice(1, -1).join("/")}/${appBase}`.replace(/^\.\//, "./")
        : `./${appBase}`;

    const cssImport =
      result["/src/index.css"] || result["/index.css"]
        ? `import "${result["/src/index.css"] ? "./src/index.css" : "./index.css"}";\n`
        : "";

    result["/index.js"] = `import React from "react";
import { createRoot } from "react-dom/client";
import App from "${importPath}";
${cssImport}
const root = createRoot(document.getElementById("root"));
root.render(<App />);`;
  }

  if (!Object.keys(result).some((p) => p.endsWith("index.html"))) {
    const tailwindScript = tailwind
      ? '<script src="https://cdn.tailwindcss.com"></script>'
      : "";
    result["/public/index.html"] = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Preview</title>
    ${tailwindScript}
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;
  }

  if (!result["/package.json"]) {
    result["/package.json"] = JSON.stringify(
      {
        name: "refineai-preview",
        main: "/index.js",
        dependencies: {
          react: "^18.2.0",
          "react-dom": "^18.2.0",
        },
      },
      null,
      2
    );
  }

  if (tailwind && !result["/src/index.css"] && !result["/index.css"]) {
    const cssPath = appPath
      ? `${appPath.substring(0, appPath.lastIndexOf("/"))}/index.css`.replace("//", "/")
      : "/src/index.css";
    result[cssPath.startsWith("/") ? cssPath : `/${cssPath}`] =
      "/* Tailwind loaded via CDN in index.html */";
  }

  return result;
}

export function buildSandpackFiles(
  projectFiles: DbFile[]
): {
  files: Record<string, string | false>;
  template: SandpackTemplate;
  entry: string;
  dependencies: Record<string, string>;
} | null {
  const files: Record<string, string> = {};

  for (const file of projectFiles) {
    if (file.status !== "done" || !file.content?.trim()) continue;
    const path = normalizeSandpackPath(file.file_path);
    const base = path.split("/").pop()?.toLowerCase() ?? "";
    if (SKIP_FILES.has(base)) continue;
    files[path] = file.content;
  }

  if (Object.keys(files).length === 0) return null;

  const prepared = preparePreviewFiles(files);
  const template = detectTemplate(prepared);
  const scaffolded =
    template === "react" ? ensureReactScaffold(prepared) : prepared;
  const finalPrepared = preparePreviewFiles(scaffolded);
  const stripped = stripSandpackTemplateDefaults(finalPrepared);
  const entry = getSandpackEntry(finalPrepared);
  const dependencies = collectSandpackDependenciesFromFiles(finalPrepared);

  return { files: stripped, template, entry, dependencies };
}

export function canUseSandpackPreview(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host !== "localhost" && host !== "127.0.0.1";
}
