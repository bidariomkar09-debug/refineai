import type { DbFile, FileStatus, ProjectPlan } from "./agentTypes";

export type ExplorerFile = DbFile & {
  isVirtual?: boolean;
};

function virtualFile(projectId: string, path: string, name: string, sortOrder: number): ExplorerFile {
  return {
    id: `virtual-${path}`,
    project_id: projectId,
    file_path: path,
    file_name: name,
    content: null,
    status: "pending",
    score: 0,
    rounds_taken: 0,
    sort_order: sortOrder,
    created_at: new Date(0).toISOString(),
    isVirtual: true,
  };
}

export function mergeProjectFiles(
  plan: ProjectPlan | null,
  dbFiles: DbFile[],
  projectId: string | null
): ExplorerFile[] {
  if (!plan?.files?.length) {
    return dbFiles.map((f) => ({ ...f, isVirtual: false }));
  }

  const byPath = new Map<string, DbFile>();
  for (const file of dbFiles) {
    byPath.set(file.file_path.replace(/\\/g, "/"), file);
  }

  const merged: ExplorerFile[] = [];

  plan.files.forEach((planned, index) => {
    const normalizedPath = planned.path.replace(/\\/g, "/");
    const existing = byPath.get(normalizedPath);

    if (existing) {
      merged.push({ ...existing, isVirtual: false });
      byPath.delete(normalizedPath);
    } else if (projectId) {
      merged.push(
        virtualFile(projectId, normalizedPath, planned.name, index)
      );
    }
  });

  for (const file of Array.from(byPath.values())) {
    merged.push({ ...file, isVirtual: false });
  }

  merged.sort((a, b) => a.sort_order - b.sort_order);
  return merged;
}

export function syncFileIntoList(files: DbFile[], incoming: DbFile): DbFile[] {
  const exists = files.some((f) => f.id === incoming.id);
  if (exists) {
    return files.map((f) => (f.id === incoming.id ? { ...f, ...incoming } : f));
  }
  return [...files, incoming].sort((a, b) => a.sort_order - b.sort_order);
}

export function updateFileInList(
  files: DbFile[],
  fileId: string,
  patch: Partial<
    Pick<
      DbFile,
      "status" | "score" | "content" | "rounds_taken" | "ai_score" | "runtime_verified" | "runtime_errors"
    >
  >
): DbFile[] {
  return files.map((f) => (f.id === fileId ? { ...f, ...patch } : f));
}

export function getFileStatusMap(files: ExplorerFile[]): Map<string, FileStatus> {
  const map = new Map<string, FileStatus>();
  for (const file of files) {
    map.set(file.file_path.replace(/\\/g, "/"), file.status);
  }
  return map;
}
