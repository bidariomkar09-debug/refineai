import type { DbFile } from "./agentTypes";

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

  const indexPath = Object.keys(result).find((p) =>
    /\/index\.(jsx?|tsx?)$/.test(p)
  );

  if (appPath && !indexPath) {
    const appBase = appPath.split("/").pop()?.replace(/\.[^.]+$/, "") ?? "App";
    const importPath = appPath.startsWith("/src/")
      ? `./src/${appBase}`
      : appPath.includes("/")
        ? `./${appPath.split("/").slice(1, -1).join("/")}/${appBase}`.replace(/^\.\//, "./")
        : `./${appBase}`;

    result["/index.js"] = `import React from "react";
import { createRoot } from "react-dom/client";
import App from "${importPath}";

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
): { files: Record<string, string>; template: SandpackTemplate } | null {
  const files: Record<string, string> = {};

  for (const file of projectFiles) {
    if (file.status !== "done" || !file.content?.trim()) continue;
    const path = normalizeSandpackPath(file.file_path);
    const base = path.split("/").pop()?.toLowerCase() ?? "";
    if (SKIP_FILES.has(base)) continue;
    files[path] = file.content;
  }

  if (Object.keys(files).length === 0) return null;

  const template = detectTemplate(files);
  const prepared =
    template === "react" ? ensureReactScaffold(files) : files;

  return { files: prepared, template };
}

export function canUseSandpackPreview(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host !== "localhost" && host !== "127.0.0.1";
}
