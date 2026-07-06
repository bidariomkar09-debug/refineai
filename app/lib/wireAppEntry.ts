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

function componentImported(content: string, name: string): boolean {
  return (
    content.includes(`import ${name} `) ||
    content.includes(`import ${name} from`) ||
    content.includes(`import { ${name}`)
  );
}

/** Merge missing section component imports into App even when not a stub. */
export function ensureAppImportsAllSections(
  files: Record<string, string>
): Record<string, string> {
  const result = { ...files };
  const appPath = findAppPath(result);
  if (!appPath) return result;

  const components = findSectionComponents(result, appPath);
  const missing = components.filter((c) => !componentImported(result[appPath] ?? "", c.name));
  if (missing.length === 0) return result;

  let content = result[appPath] ?? "";
  const importLines = missing.map((c) => `import ${c.name} from "${c.importPath}";`).join("\n");

  if (/^import\s/m.test(content)) {
    const lines = content.split("\n");
    let lastImportIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (/^\s*import\s/.test(lines[i])) lastImportIdx = i;
    }
    if (lastImportIdx >= 0) {
      lines.splice(lastImportIdx + 1, 0, importLines);
      content = lines.join("\n");
    } else {
      content = `${importLines}\n${content}`;
    }
  } else {
    content = `import React from "react";\n${importLines}\n\n${content}`;
  }

  const missingJsx = missing.filter((c) => !content.includes(`<${c.name}`));
  if (missingJsx.length > 0) {
    const tags = missingJsx.map((c) => `<${c.name} />`).join("\n      ");
    if (content.includes("</div>")) {
      content = content.replace(/(\s*)<\/div>/, `$1      ${tags}\n$1</div>`);
    } else {
      const returnMatch = content.match(/return\s*\(\s*\n?/);
      if (returnMatch && returnMatch.index != null) {
        const insertAt = returnMatch.index + returnMatch[0].length;
        content = `${content.slice(0, insertAt)}\n      ${tags}\n${content.slice(insertAt)}`;
      }
    }
  }

  result[appPath] = content;
  return result;
}

/** Replace stub App.js with imports for all section components in src/. */
export function wireAppEntry(files: Record<string, string>): Record<string, string> {
  const result = { ...files };
  const appPath = findAppPath(result);
  if (!appPath) return result;

  const current = result[appPath] ?? "";
  const components = findSectionComponents(result, appPath);
  if (components.length === 0) return result;

  if (isStubAppContent(current)) {
    result[appPath] = synthesizeAppJs(appPath, components);
  }

  return ensureAppImportsAllSections(result);
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
