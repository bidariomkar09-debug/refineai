import { resolveRelativeImport } from "./previewAssetStubs";

const IMPORT_RE =
  /(?:import\s+(?:[\w*{}\s,]+\s+from\s+)?|import\s+['"]|require\s*\(\s*)['"]([^'"]+)['"]/g;

const CODE_EXTENSIONS = /\.(jsx?|tsx?|mjs|cjs)$/i;

function isCodeFile(path: string): boolean {
  return CODE_EXTENSIONS.test(path);
}

export function collectImports(content: string): string[] {
  const found: string[] = [];
  IMPORT_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = IMPORT_RE.exec(content)) !== null) {
    found.push(match[1]);
  }
  return found;
}

export function validateImportGraph(
  files: Record<string, string>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const paths = new Set(Object.keys(files));

  for (const [filePath, content] of Object.entries(files)) {
    if (!isCodeFile(filePath)) continue;

    for (const spec of collectImports(content)) {
      if (spec.startsWith(".")) {
        const resolved = resolveRelativeImport(filePath, spec);
        const withExt = paths.has(resolved)
          ? resolved
          : Array.from(paths).find(
              (p) =>
                p === resolved ||
                p === `${resolved}.js` ||
                p === `${resolved}.jsx` ||
                p === `${resolved}.ts` ||
                p === `${resolved}.tsx`
            );
        if (!withExt) {
          errors.push(`${filePath}: unresolved import "${spec}"`);
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateFileImports(
  filePath: string,
  content: string,
  projectFiles: Record<string, string>
): { valid: boolean; errors: string[] } {
  const normalized = filePath.startsWith("/") ? filePath : `/${filePath}`;
  const merged = { ...projectFiles, [normalized]: content };
  const result = validateImportGraph(merged);
  const prefix = `${normalized}:`;
  return {
    valid: result.errors.every((e) => !e.startsWith(prefix)),
    errors: result.errors.filter((e) => e.startsWith(prefix)),
  };
}
