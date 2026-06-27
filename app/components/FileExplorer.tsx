"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ExplorerFile } from "@/app/lib/mergeProjectFiles";
import {
  buildFileTree,
  shouldExpandFolder,
  type TreeFolderNode,
  type TreeNode,
} from "@/app/lib/fileTreeUtils";
import FileIcon, { FolderIcon } from "./FileIcon";

type FileExplorerProps = {
  files: ExplorerFile[];
  selectedFileId: string | null;
  activeFileId: string | null;
  onSelectFile: (file: ExplorerFile) => void;
};

function StatusDot({ status, score }: { status: ExplorerFile["status"]; score: number }) {
  if (status === "building") {
    return (
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="absolute inline-flex h-full w-full motion-safe:animate-ping rounded-full bg-accent opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
      </span>
    );
  }
  if (status === "done" && score >= 90) {
    return <span className="h-2 w-2 shrink-0 rounded-full bg-accent-green" title="Done" />;
  }
  if (status === "error") {
    return <span className="h-2 w-2 shrink-0 rounded-full bg-red-400" title="Error" />;
  }
  if (status === "skipped") {
    return <span className="h-2 w-2 shrink-0 rounded-full bg-gray-600" title="Skipped" />;
  }
  return <span className="h-2 w-2 shrink-0 rounded-full bg-gray-500" title="Pending" />;
}

function fileRowClass(file: ExplorerFile, selected: boolean): string {
  const base =
    "group flex w-full items-center gap-1.5 rounded-r-lg py-1 pr-2 text-left text-xs transition-colors duration-150";

  if (selected) {
    return `${base} border-l-2 border-accent bg-accent/15 text-white`;
  }

  if (file.status === "building") {
    return `${base} border-l-2 border-transparent text-accent hover:bg-accent/10`;
  }
  if (file.status === "done" && file.score >= 90) {
    return `${base} border-l-2 border-transparent text-gray-200 hover:bg-surface-border/40`;
  }
  if (file.status === "error") {
    return `${base} border-l-2 border-transparent text-red-400 hover:bg-red-500/10`;
  }
  if (file.status === "skipped") {
    return `${base} border-l-2 border-transparent italic text-gray-600 hover:bg-surface-border/30`;
  }

  return `${base} border-l-2 border-transparent text-gray-500 hover:bg-surface-border/40 hover:text-gray-300`;
}

function TreeFolder({
  node,
  depth,
  files,
  selectedFileId,
  activeFileId,
  onSelectFile,
  defaultOpen,
}: {
  node: TreeFolderNode;
  depth: number;
  files: ExplorerFile[];
  selectedFileId: string | null;
  activeFileId: string | null;
  onSelectFile: (file: ExplorerFile) => void;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const paddingLeft = 8 + depth * 12;

  useEffect(() => {
    if (defaultOpen) setOpen(true);
  }, [defaultOpen]);

  if (node.name === "" && node.children.length > 0) {
    return (
      <>
        {node.children.map((child) => (
          <TreeNodeRow
            key={child.type === "file" ? child.file.id : child.path}
            node={child}
            depth={depth}
            files={files}
            selectedFileId={selectedFileId}
            activeFileId={activeFileId}
            onSelectFile={onSelectFile}
          />
        ))}
      </>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1 rounded-lg py-1 pr-2 text-left text-xs text-gray-400 transition hover:bg-surface-border/40 hover:text-gray-200"
        style={{ paddingLeft }}
      >
        <Chevron open={open} />
        <FolderIcon open={open} />
        <span className="truncate font-medium">{node.name}</span>
      </button>
      {open && (
        <div>
          {node.children.map((child) => (
            <TreeNodeRow
              key={child.type === "file" ? child.file.id : child.path}
              node={child}
              depth={depth + 1}
              files={files}
              selectedFileId={selectedFileId}
              activeFileId={activeFileId}
              onSelectFile={onSelectFile}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-3 w-3 shrink-0 text-gray-500 transition-transform duration-150 ${open ? "rotate-90" : ""}`}
      viewBox="0 0 12 12"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M4 2l4 4-4 4V2z" />
    </svg>
  );
}

function TreeNodeRow({
  node,
  depth,
  files,
  selectedFileId,
  activeFileId,
  onSelectFile,
}: {
  node: TreeNode;
  depth: number;
  files: ExplorerFile[];
  selectedFileId: string | null;
  activeFileId: string | null;
  onSelectFile: (file: ExplorerFile) => void;
}) {
  const rowRef = useRef<HTMLButtonElement>(null);
  const file = node.type === "file" ? (node.file as ExplorerFile) : null;
  const isActive = file
    ? activeFileId === file.id || file.status === "building"
    : false;

  useEffect(() => {
    if (isActive && rowRef.current) {
      rowRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [isActive, file?.status]);

  if (node.type === "folder") {
    return (
      <TreeFolder
        node={node}
        depth={depth}
        files={files}
        selectedFileId={selectedFileId}
        activeFileId={activeFileId}
        onSelectFile={onSelectFile}
        defaultOpen={shouldExpandFolder(node, files)}
      />
    );
  }

  const selected = selectedFileId === file!.id;
  const paddingLeft = 8 + depth * 12 + 16;

  return (
    <button
      ref={rowRef}
      type="button"
      onClick={() => onSelectFile(file!)}
      className={fileRowClass(file!, selected)}
      style={{ paddingLeft }}
    >
      <FileIcon filePath={file!.file_path} />
      <span className="min-w-0 flex-1 truncate">{file!.file_name}</span>
      <StatusDot status={file!.status} score={file!.score} />
      {(file!.status === "done" || file!.status === "building") && file!.score > 0 && (
        <span
          className={`shrink-0 rounded px-1 py-0.5 text-[10px] font-semibold tabular-nums ${
            file!.score >= 90 ? "bg-accent-green/15 text-accent-green" : "bg-gray-700/50 text-gray-400"
          }`}
        >
          {file!.score}%
        </span>
      )}
    </button>
  );
}

export default function FileExplorer({
  files,
  selectedFileId,
  activeFileId,
  onSelectFile,
}: FileExplorerProps) {
  const tree = useMemo(() => buildFileTree(files), [files]);

  if (files.length === 0) {
    return (
      <p className="px-3 py-4 text-xs text-gray-500">Files will appear after planning.</p>
    );
  }

  return (
    <div className="py-1">
      {tree.children.map((child) => (
        <TreeNodeRow
          key={child.type === "file" ? child.file.id : child.path}
          node={child}
          depth={0}
          files={files}
          selectedFileId={selectedFileId}
          activeFileId={activeFileId}
          onSelectFile={onSelectFile}
        />
      ))}
    </div>
  );
}
