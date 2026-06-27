import type { DbFile } from "./agentTypes";

export type TreeFileNode = {
  type: "file";
  name: string;
  file: DbFile;
};

export type TreeFolderNode = {
  type: "folder";
  name: string;
  path: string;
  children: TreeNode[];
};

export type TreeNode = TreeFileNode | TreeFolderNode;

function insertFile(root: TreeFolderNode, segments: string[], file: DbFile): void {
  if (segments.length === 1) {
    root.children.push({ type: "file", name: segments[0], file });
    return;
  }

  const [head, ...rest] = segments;
  const folderPath = root.path ? `${root.path}/${head}` : head;
  let folder = root.children.find(
    (c): c is TreeFolderNode => c.type === "folder" && c.name === head
  );

  if (!folder) {
    folder = { type: "folder", name: head, path: folderPath, children: [] };
    root.children.push(folder);
  }

  insertFile(folder, rest, file);
}

export function buildFileTree(files: DbFile[]): TreeFolderNode {
  const root: TreeFolderNode = {
    type: "folder",
    name: "",
    path: "",
    children: [],
  };

  for (const file of files) {
    const normalized = file.file_path.replace(/\\/g, "/");
    const segments = normalized.split("/").filter(Boolean);
    if (segments.length === 0) {
      root.children.push({ type: "file", name: file.file_name, file });
    } else {
      insertFile(root, segments, file);
    }
  }

  sortTree(root);
  return root;
}

function sortTree(node: TreeFolderNode): void {
  node.children.sort((a, b) => {
    if (a.type === "folder" && b.type === "file") return -1;
    if (a.type === "file" && b.type === "folder") return 1;
    return a.name.localeCompare(b.name);
  });

  for (const child of node.children) {
    if (child.type === "folder") sortTree(child);
  }
}

export function shouldExpandFolder(node: TreeFolderNode, files: DbFile[]): boolean {
  return node.children.some((child) => {
    if (child.type === "file") {
      return child.file.status === "building" || child.file.status === "done";
    }
    return shouldExpandFolder(child, files);
  });
}
