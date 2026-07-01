import { importPathFromApp } from "./previewAssetStubs";

const SECTION_ORDER = [
  "hero",
  "header",
  "about",
  "whatido",
  "what-i-do",
  "skills",
  "projects",
  "social",
  "contact",
  "footer",
];

function componentSortKey(name: string): number {
  const lower = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const idx = SECTION_ORDER.findIndex((token) => lower.includes(token.replace(/-/g, "")));
  return idx >= 0 ? idx : 100;
}

export function isStubAppContent(content: string): boolean {
  const trimmed = content.trim();
  if (!trimmed) return true;
  if (/hello\s*world/i.test(trimmed)) return true;
  const localImports = trimmed.match(/from\s+['"]\.\//g);
  if (!localImports || localImports.length === 0) {
    return trimmed.length < 400;
  }
  return false;
}

function findAppPath(files: Record<string, string>): string | null {
  return (
    Object.keys(files).find((p) => /\/src\/App\.(jsx?|tsx?)$/i.test(p)) ??
    Object.keys(files).find((p) => /^\/App\.(jsx?|tsx?)$/i.test(p)) ??
    null
  );
}

function findSectionComponents(
  files: Record<string, string>,
  appPath: string
): { name: string; path: string; importPath: string }[] {
  const appDir = appPath.substring(0, appPath.lastIndexOf("/")) || "";
  const components: { name: string; path: string; importPath: string; sort: number }[] = [];

  for (const path of Object.keys(files)) {
    if (path === appPath) continue;
    if (!/\.(jsx?|tsx?)$/i.test(path)) continue;
    if (/\/index\.(jsx?|tsx?)$/i.test(path)) continue;
    if (/\/App\.(jsx?|tsx?)$/i.test(path)) continue;

    const inSrcTree =
      path.startsWith("/src/") ||
      (appDir && path.startsWith(`${appDir}/`));
    if (!inSrcTree) continue;

    const name = path.split("/").pop()?.replace(/\.[^.]+$/, "") ?? "";
    if (!name || !/^[A-Z]/.test(name)) continue;

    components.push({
      name,
      path,
      importPath: importPathFromApp(appPath, path),
      sort: componentSortKey(name),
    });
  }

  components.sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name));

  const seen = new Set<string>();
  return components.filter((c) => {
    if (seen.has(c.path)) return false;
    seen.add(c.path);
    return true;
  });
}

export function synthesizeAppJs(
  appPath: string,
  components: { name: string; importPath: string }[]
): string {
  const imports = components
    .map((c) => `import ${c.name} from "${c.importPath}";`)
    .join("\n");
  const body = components.map((c) => `      <${c.name} />`).join("\n");

  return `import React from "react";
${imports}

export default function App() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
${body}
    </div>
  );
}
`;
}

/** Replace stub App.js with imports for all section components in src/. */
export function wireAppEntry(files: Record<string, string>): Record<string, string> {
  const result = { ...files };
  const appPath = findAppPath(result);
  if (!appPath) return result;

  const current = result[appPath] ?? "";
  const components = findSectionComponents(result, appPath);
  if (components.length === 0) return result;

  if (!isStubAppContent(current)) return result;

  result[appPath] = synthesizeAppJs(appPath, components);
  return result;
}

export function wireAppEntryFromDbFiles(
  projectFiles: { file_path: string; content: string | null; status: string }[]
): { appPath: string; content: string } | null {
  const files: Record<string, string> = {};
  for (const file of projectFiles) {
    if (file.status !== "done" || !file.content?.trim()) continue;
    const path = file.file_path.replace(/\\/g, "/");
    files[path.startsWith("/") ? path : `/${path}`] = file.content;
  }

  const appPathRaw = findAppPath(files);
  if (!appPathRaw) return null;

  const wired = wireAppEntry(files);
  const next = wired[appPathRaw];
  const prev = files[appPathRaw];
  if (!next || next === prev) return null;

  const dbPath = appPathRaw.startsWith("/") ? appPathRaw.slice(1) : appPathRaw;
  return { appPath: dbPath, content: next };
}
