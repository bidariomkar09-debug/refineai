import type { DbFile } from "./agentTypes";
import { meetsQualityThreshold } from "./agentTypes";

/** Target: 95% quality in ~60s for typical React SPA builds */
export const FAST_BUILD_MODEL = "gpt-4o-mini";
export const BUILD_PARALLEL_BATCH = 4;
export const FILE_SPEED_MAX_REFINE = 1;
export const PREVIEW_VERIFY_MAX_ATTEMPTS = 2;

const APP_ENTRY_RE = /(?:^|\/)src\/App\.(jsx?|tsx?)$/i;
const ROOT_APP_RE = /^App\.(jsx?|tsx?)$/i;

const SCAFFOLD_FILES = new Set([
  "package.json",
  "src/index.js",
  "src/index.tsx",
  "index.js",
  "public/index.html",
]);

export function isAutoWiredAppFile(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/");
  return APP_ENTRY_RE.test(normalized) || ROOT_APP_RE.test(normalized);
}

export function isScaffoldFile(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/").toLowerCase();
  const base = normalized.split("/").pop() ?? normalized;
  return SCAFFOLD_FILES.has(normalized) || SCAFFOLD_FILES.has(base);
}

export function hasSectionComponents(files: DbFile[]): boolean {
  return files.some((f) =>
    /src\/components\/[A-Z][\w-]*\.(jsx?|tsx?)$/i.test(f.file_path.replace(/\\/g, "/"))
  );
}

/** Skip LLM build — wire-app or Sandpack scaffold handles these */
export function shouldSkipFileBuild(file: DbFile, allFiles: DbFile[]): boolean {
  if (file.status === "skipped" || file.status === "done") return true;
  if (isScaffoldFile(file.file_path)) return true;
  if (isAutoWiredAppFile(file.file_path) && hasSectionComponents(allFiles)) {
    return true;
  }
  return false;
}

export function partitionBuildQueue(files: DbFile[]): {
  build: DbFile[];
  skip: DbFile[];
} {
  const build: DbFile[] = [];
  const skip: DbFile[] = [];
  for (const file of files) {
    if (shouldSkipFileBuild(file, files)) {
      skip.push(file);
    } else if (file.status !== "done" || !meetsQualityThreshold(file.score)) {
      build.push(file);
    }
  }
  return { build, skip };
}
