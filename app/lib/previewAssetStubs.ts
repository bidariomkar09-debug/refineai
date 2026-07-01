const STYLE_IMPORT =
  /import\s+['"](\.\/?[^'"]+\.(?:css|scss|sass|less))['"]\s*;?/g;
const STYLE_REQUIRE =
  /require\s*\(\s*['"](\.\/?[^'"]+\.(?:css|scss|sass|less))['"]\s*\)/g;

function dirname(filePath: string): string {
  const idx = filePath.lastIndexOf("/");
  return idx >= 0 ? filePath.slice(0, idx) : "";
}

function resolveRelativeImport(fromFile: string, importPath: string): string {
  const base = dirname(fromFile);
  const raw = importPath.replace(/^\.\//, "");
  const parts = base.split("/").filter(Boolean);
  for (const segment of raw.split("/")) {
    if (segment === "..") parts.pop();
    else if (segment !== ".") parts.push(segment);
  }
  return `/${parts.join("/")}`;
}

function collectStyleImports(content: string): string[] {
  const found: string[] = [];
  for (const re of [STYLE_IMPORT, STYLE_REQUIRE]) {
    re.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(content)) !== null) {
      found.push(match[1]);
    }
  }
  return found;
}

const STUB_CSS = "/* Preview stub — Tailwind/styles applied via CDN or className */";

/** Create placeholder CSS files for any relative stylesheet imports that are missing. */
export function ensureMissingStyleImports(
  files: Record<string, string>
): Record<string, string> {
  const result = { ...files };

  for (const [filePath, content] of Object.entries(files)) {
    if (!/\.(jsx?|tsx?)$/i.test(filePath)) continue;

    for (const importPath of collectStyleImports(content)) {
      const resolved = resolveRelativeImport(filePath, importPath);
      if (!result[resolved]) {
        result[resolved] = STUB_CSS;
      }
    }
  }

  return result;
}

export function importPathFromApp(appPath: string, componentPath: string): string {
  const appDir = dirname(appPath);
  const compNoExt = componentPath.replace(/\.[^.]+$/, "");
  if (compNoExt.startsWith(`${appDir}/`)) {
    return `.${compNoExt.slice(appDir.length)}`;
  }
  const name = componentPath.split("/").pop()?.replace(/\.[^.]+$/, "") ?? "Component";
  return `./${name}`;
}
