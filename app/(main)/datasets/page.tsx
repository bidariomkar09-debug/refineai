"use client";

import { useEffect, useMemo, useState } from "react";
import type { DatasetFile } from "@/app/lib/settingsTypes";
import PageHeader from "@/app/components/shell/PageHeader";
import LoadingState from "@/app/components/shell/LoadingState";
import EmptyState from "@/app/components/shell/EmptyState";

const FILE_TYPES = [".tsx", ".ts", ".css", ".json", ".md", ".sql"] as const;

export default function DatasetsPage() {
  const [files, setFiles] = useState<DatasetFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selected, setSelected] = useState<DatasetFile | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/datasets")
      .then((r) => r.json())
      .then((data) => setFiles(data.files ?? []))
      .catch(() => setFiles([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = [...files];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (f) =>
          f.file_name.toLowerCase().includes(q) ||
          f.file_path.toLowerCase().includes(q)
      );
    }
    if (typeFilter !== "all") {
      list = list.filter((f) => f.file_path.endsWith(typeFilter));
    }
    return list;
  }, [files, search, typeFilter]);

  const copyCode = async () => {
    if (!selected?.content) return;
    await navigator.clipboard.writeText(selected.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <PageHeader
        title="Datasets"
        description="Browse all generated code files across your projects."
        crumbs={[{ label: "RefineAI", href: "/dashboard" }, { label: "Datasets" }]}
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          placeholder="Search by file name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-lg border border-white/10 bg-[#16161f] px-4 py-2 text-sm text-white placeholder:text-gray-500 focus:border-indigo-500 focus:outline-none"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-white/10 bg-[#16161f] px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
        >
          <option value="all">All types</option>
          {FILE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <LoadingState />
      ) : files.length === 0 ? (
        <EmptyState
          title="No files yet"
          description="Generated code files will appear here after you build a project."
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="max-h-[600px] overflow-y-auto rounded-xl border border-white/10 bg-[#16161f]">
            <ul className="divide-y divide-white/5">
              {filtered.map((f) => (
                <li key={f.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(f)}
                    className={`w-full px-4 py-3 text-left transition hover:bg-white/5 ${
                      selected?.id === f.id ? "bg-indigo-500/10 border-l-2 border-indigo-500" : ""
                    }`}
                  >
                    <p className="font-mono text-sm text-white">{f.file_path}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {f.project_name} · {f.score}% quality
                    </p>
                  </button>
                </li>
              ))}
            </ul>
            {filtered.length === 0 && (
              <p className="p-6 text-center text-sm text-gray-400">No files match your filters.</p>
            )}
          </div>

          <div className="rounded-xl border border-white/10 bg-[#16161f]">
            {selected ? (
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                  <div>
                    <p className="font-mono text-sm text-white">{selected.file_path}</p>
                    <p className="text-xs text-gray-500">
                      From {selected.project_name} · Score: {selected.score}%
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={copyCode}
                    disabled={!selected.content}
                    className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                  >
                    {copied ? "Copied!" : "Copy code"}
                  </button>
                </div>
                <pre className="flex-1 overflow-auto p-4 text-xs leading-relaxed text-gray-300">
                  {selected.content ?? "No content stored."}
                </pre>
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center text-sm text-gray-500">
                Select a file to view its code
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
