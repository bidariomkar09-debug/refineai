import { parse } from "@babel/parser";
import type { DbFile } from "./agentTypes";
import { checkSyntax } from "./fileLoopEngine";
import { verifyProjectPreview } from "./previewVerify";
import { buildSandpackFiles } from "./previewSandpack";
import { isPreviewDevOnly, materializeProject } from "./previewRunner";
import { PREVIEW_URL } from "./previewTypes";

export type RuntimeVerifyResult = {
  ok: boolean;
  errors: string[];
  httpStatus?: number;
};

const RUNTIME_TIMEOUT_MS = 20_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

function compileSandpackBundle(files: Record<string, string>): string[] {
  const errors: string[] = [];
  for (const [filePath, content] of Object.entries(files)) {
    if (!/\.(jsx?|tsx?)$/.test(filePath)) continue;
    const syntax = checkSyntax(content);
    if (!syntax.valid) {
      errors.push(`${filePath}: ${syntax.issues.join("; ")}`);
      continue;
    }
    try {
      parse(content, {
        sourceType: "module",
        plugins: ["jsx", "typescript"],
        errorRecovery: false,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message.split("\n")[0] : "Parse error";
      errors.push(`${filePath}: ${msg}`);
    }
  }
  return errors;
}

async function verifySandpackRuntime(projectFiles: DbFile[]): Promise<RuntimeVerifyResult> {
  const errors: string[] = [];

  const bundle = buildSandpackFiles(projectFiles);
  if (!bundle) {
    return { ok: false, errors: ["No buildable files for runtime verification"] };
  }

  const staticResult = verifyProjectPreview(projectFiles);
  if (!staticResult.ok) {
    errors.push(...staticResult.errors);
  }

  const codeFiles: Record<string, string> = {};
  for (const [path, content] of Object.entries(bundle.files)) {
    if (content !== false && typeof content === "string") {
      codeFiles[path] = content;
    }
  }

  errors.push(...compileSandpackBundle(codeFiles));

  return { ok: errors.length === 0, errors };
}

async function verifyDevServerRuntime(projectId: string): Promise<RuntimeVerifyResult> {
  if (!isPreviewDevOnly()) {
    return { ok: false, errors: ["Dev-server runtime only available in development"] };
  }

  try {
    await withTimeout(materializeProject(projectId), RUNTIME_TIMEOUT_MS, "Materialize project");

    const start = Date.now();
    let httpStatus: number | undefined;
    while (Date.now() - start < RUNTIME_TIMEOUT_MS) {
      try {
        const res = await fetch(PREVIEW_URL, { signal: AbortSignal.timeout(2000) });
        httpStatus = res.status;
        if (res.ok) {
          return { ok: true, errors: [], httpStatus };
        }
      } catch {
        // server not ready
      }
      await new Promise((r) => setTimeout(r, 1000));
    }

    return {
      ok: false,
      errors: [`Dev server did not return HTTP 200 within ${RUNTIME_TIMEOUT_MS}ms`],
      httpStatus,
    };
  } catch (err) {
    return {
      ok: false,
      errors: [err instanceof Error ? err.message : "Dev-server runtime failed"],
    };
  }
}

export type VerifyFileRuntimeInput = {
  projectId: string;
  file: DbFile;
  allProjectFiles: DbFile[];
  content: string;
};

export async function verifyFileRuntime(
  input: VerifyFileRuntimeInput
): Promise<RuntimeVerifyResult> {
  const projectFiles = input.allProjectFiles.map((f) =>
    f.id === input.file.id
      ? { ...f, content: input.content, status: "done" as const }
      : f
  );

  const sandpackResult = await withTimeout(
    verifySandpackRuntime(projectFiles),
    RUNTIME_TIMEOUT_MS,
    "Sandpack runtime"
  ).catch((err: Error) => ({
    ok: false,
    errors: [err.message],
  }));

  if (sandpackResult.ok) {
    return sandpackResult;
  }

  if (isPreviewDevOnly()) {
    const devResult: RuntimeVerifyResult = await verifyDevServerRuntime(input.projectId).catch(
      (err: Error): RuntimeVerifyResult => ({
        ok: false,
        errors: [err.message],
      })
    );
    if (devResult.ok) return devResult;
    return {
      ok: false,
      errors: [...sandpackResult.errors, ...devResult.errors],
      httpStatus: devResult.httpStatus,
    };
  }

  return sandpackResult;
}
