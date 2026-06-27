import { spawn, type ChildProcess } from "child_process";
import fs from "fs/promises";
import path from "path";
import { getProjectFiles } from "./db";
import { getMissingScaffold, mergePackageJson } from "./previewScaffold";
import {
  PREVIEW_PORT,
  PREVIEW_URL,
  type PreviewLogLine,
  type PreviewState,
} from "./previewTypes";

const PREVIEW_ROOT = path.join(process.cwd(), ".preview-projects");
const MAX_LOG_LINES = 500;

let devProcess: ChildProcess | null = null;
let logLines: PreviewLogLine[] = [];
let logListeners: Array<(line: PreviewLogLine) => void> = [];
let state: PreviewState = {
  status: "idle",
  port: PREVIEW_PORT,
  url: PREVIEW_URL,
  projectId: null,
  lastUpdated: null,
  error: null,
};

function pushLog(type: PreviewLogLine["type"], message: string) {
  const line: PreviewLogLine = {
    type,
    message,
    timestamp: new Date().toISOString(),
  };
  logLines.push(line);
  if (logLines.length > MAX_LOG_LINES) logLines.shift();
  for (const listener of logListeners) listener(line);
}

function setState(partial: Partial<PreviewState>) {
  state = {
    ...state,
    ...partial,
    lastUpdated: new Date().toISOString(),
  };
  if (partial.status) {
    pushLog("status", partial.status);
  }
}

export function getPreviewState(): PreviewState {
  return { ...state };
}

export function getPreviewLogs(): PreviewLogLine[] {
  return [...logLines];
}

export function subscribePreviewLogs(listener: (line: PreviewLogLine) => void) {
  logListeners.push(listener);
  return () => {
    logListeners = logListeners.filter((l) => l !== listener);
  };
}

export function isPreviewDevOnly(): boolean {
  return process.env.NODE_ENV === "development";
}

function runCommand(
  cmd: string,
  args: string[],
  cwd: string
): Promise<number> {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, {
      cwd,
      shell: true,
      env: { ...process.env, FORCE_COLOR: "0" },
    });

    proc.stdout?.on("data", (data: Buffer) => {
      const text = data.toString().trim();
      if (text) pushLog("log", text);
    });

    proc.stderr?.on("data", (data: Buffer) => {
      const text = data.toString().trim();
      if (text) pushLog("log", text);
    });

    proc.on("close", (code) => resolve(code ?? 1));
    proc.on("error", () => resolve(1));
  });
}

export async function killPort3001(): Promise<void> {
  await new Promise<void>((resolve) => {
    const proc = spawn(
      "sh",
      ["-c", `lsof -ti :${PREVIEW_PORT} | xargs kill -9 2>/dev/null || true`]
    );
    proc.on("close", () => resolve());
    proc.on("error", () => resolve());
  });
  if (devProcess) {
    devProcess.kill("SIGTERM");
    devProcess = null;
  }
}

async function copyEnvLocal(projectDir: string): Promise<void> {
  const envPath = path.join(process.cwd(), ".env.local");
  try {
    await fs.access(envPath);
    await fs.copyFile(envPath, path.join(projectDir, ".env.local"));
  } catch {
    // optional
  }
}

export async function materializeProject(projectId: string): Promise<string> {
  const projectDir = path.join(PREVIEW_ROOT, projectId);
  await fs.mkdir(projectDir, { recursive: true });

  const files = await getProjectFiles(projectId);
  const doneFiles = files.filter((f) => f.status === "done" && f.content);

  const writtenPaths = new Set<string>();

  for (const file of doneFiles) {
    const normalized = file.file_path.replace(/\\/g, "/");
    const fullPath = path.join(projectDir, normalized);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    let content = file.content ?? "";
    if (normalized === "package.json") {
      content = mergePackageJson(content);
    }
    await fs.writeFile(fullPath, content, "utf-8");
    writtenPaths.add(normalized);
  }

  const missing = getMissingScaffold(writtenPaths);
  for (const scaffold of missing) {
    if (scaffold.path === "package.json" && writtenPaths.has("package.json")) continue;
    const fullPath = path.join(projectDir, scaffold.path);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, scaffold.content, "utf-8");
    writtenPaths.add(scaffold.path);
  }

  if (writtenPaths.has("package.json")) {
    const pkgPath = path.join(projectDir, "package.json");
    const raw = await fs.readFile(pkgPath, "utf-8");
    await fs.writeFile(pkgPath, mergePackageJson(raw), "utf-8");
  }

  await copyEnvLocal(projectDir);
  return projectDir;
}

async function healthCheck(timeoutMs = 60000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(PREVIEW_URL, { signal: AbortSignal.timeout(2000) });
      if (res.ok || res.status < 500) return true;
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  return false;
}

export async function startPreview(projectId: string): Promise<PreviewState> {
  if (!isPreviewDevOnly()) {
    setState({ status: "error", error: "Preview is only available in development", projectId });
    return getPreviewState();
  }

  logLines = [];
  setState({ status: "installing", projectId, error: null });
  pushLog("log", "Preparing your app...");

  await killPort3001();

  let projectDir: string;
  try {
    projectDir = await materializeProject(projectId);
  } catch {
    setState({ status: "error", error: "Could not prepare project files" });
    return getPreviewState();
  }

  pushLog("log", "Installing dependencies...");
  let installCode = await runCommand("npm", ["install"], projectDir);
  if (installCode !== 0) {
    pushLog("log", "Retrying install...");
    installCode = await runCommand("npm", ["install"], projectDir);
  }

  if (installCode !== 0) {
    setState({ status: "error", error: "Install failed" });
    return getPreviewState();
  }

  setState({ status: "starting" });
  pushLog("log", "Starting preview server...");

  devProcess = spawn("npm", ["run", "dev"], {
    cwd: projectDir,
    shell: true,
    env: { ...process.env, FORCE_COLOR: "0" },
  });

  devProcess.stdout?.on("data", (data: Buffer) => {
    const text = data.toString().trim();
    if (text) pushLog("log", text);
  });

  devProcess.stderr?.on("data", (data: Buffer) => {
    const text = data.toString().trim();
    if (text) pushLog("log", text);
  });

  devProcess.on("exit", () => {
    if (state.status === "running") {
      setState({ status: "error", error: "Preview server stopped" });
    }
    devProcess = null;
  });

  const ready = await healthCheck();
  if (ready) {
    setState({ status: "running", error: null });
    pushLog("complete", "Preview ready");
  } else {
    setState({ status: "error", error: "Preview failed to start" });
  }

  return getPreviewState();
}

export async function stopPreview(): Promise<void> {
  await killPort3001();
  setState({ status: "idle", projectId: null, error: null });
}

export async function syncPreview(projectId: string): Promise<PreviewState> {
  const wasRunning = state.status === "running" || state.status === "starting";
  await killPort3001();
  if (wasRunning) {
    return startPreview(projectId);
  }
  await materializeProject(projectId);
  setState({ projectId, status: "idle" });
  return getPreviewState();
}

export async function probePreviewUrl(): Promise<boolean> {
  try {
    const res = await fetch(PREVIEW_URL, { signal: AbortSignal.timeout(3000) });
    return res.ok || res.status < 500;
  } catch {
    return false;
  }
}
