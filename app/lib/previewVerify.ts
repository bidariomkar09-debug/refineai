import type { DbFile } from "./agentTypes";
import { buildSandpackFiles } from "./previewSandpack";
import { validateImportGraph } from "./importGraph";
import { getMissingNpmDependencies } from "./sandpackDependencies";

export type PreviewVerifyResult = {
  ok: boolean;
  errors: string[];
};

export function verifyProjectPreview(projectFiles: DbFile[]): PreviewVerifyResult {
  const errors: string[] = [];

  const bundle = buildSandpackFiles(projectFiles);
  if (!bundle) {
    return { ok: false, errors: ["No buildable files for preview"] };
  }

  const codeFiles: Record<string, string> = {};
  for (const [path, content] of Object.entries(bundle.files)) {
    if (content !== false && typeof content === "string") {
      codeFiles[path] = content;
    }
  }

  const importCheck = validateImportGraph(codeFiles);
  if (!importCheck.valid) {
    errors.push(...importCheck.errors);
  }

  const missingDeps = getMissingNpmDependencies(codeFiles);
  if (missingDeps.length > 0) {
    errors.push(
      ...missingDeps.map((pkg) => `Missing Sandpack dependency: ${pkg}`)
    );
  }

  if (bundle.template === "nextjs") {
    errors.push(
      "Next.js App Router preview is not fully supported — use React SPA (src/App.js) for guaranteed preview"
    );
  }

  return { ok: errors.length === 0, errors };
}
