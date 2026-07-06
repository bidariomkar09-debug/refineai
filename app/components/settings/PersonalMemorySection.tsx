"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  PastProjectSummary,
  PersonalMemory,
  PreferredStackMemory,
} from "@/app/lib/personalMemoryTypes";
import {
  effectiveList,
  effectiveStack,
  normalizePersonalMemory,
} from "@/app/lib/personalMemory";

const STACK_FIELDS: Array<{ key: keyof PreferredStackMemory; label: string }> = [
  { key: "frontend", label: "Frontend" },
  { key: "backend", label: "Backend" },
  { key: "database", label: "Database" },
  { key: "styling", label: "Styling" },
  { key: "deploy", label: "Deploy" },
  { key: "ai", label: "AI" },
];

function linesToList(text: string): string[] {
  return text
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function listToLines(items: string[]): string {
  return items.join("\n");
}

export default function PersonalMemorySection() {
  const [memory, setMemory] = useState<PersonalMemory | null>(null);
  const [stack, setStack] = useState<PreferredStackMemory>({});
  const [codingStyle, setCodingStyle] = useState("");
  const [designTaste, setDesignTaste] = useState("");
  const [codingPatterns, setCodingPatterns] = useState("");
  const [userNotes, setUserNotes] = useState("");
  const [summaries, setSummaries] = useState<PastProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const hydrateForm = useCallback((raw: PersonalMemory) => {
    const normalized = normalizePersonalMemory(raw);
    setMemory(normalized);
    setStack(effectiveStack(normalized));
    setCodingStyle(
      listToLines(
        effectiveList(normalized.codingStyle, normalized.userOverrides?.codingStyle)
      )
    );
    setDesignTaste(
      listToLines(
        effectiveList(normalized.designTaste, normalized.userOverrides?.designTaste)
      )
    );
    setCodingPatterns(
      listToLines(
        effectiveList(
          normalized.codingPatterns,
          normalized.userOverrides?.codingPatterns
        )
      )
    );
    setUserNotes(normalized.userEditedNotes);
    setSummaries(normalized.pastProjectSummaries);
  }, []);

  useEffect(() => {
    fetch("/api/memory")
      .then((r) => r.json())
      .then((data) => {
        if (data.memory) hydrateForm(data.memory);
      })
      .catch(() => setError("Could not load personal memory."))
      .finally(() => setLoading(false));
  }, [hydrateForm]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const res = await fetch("/api/memory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEditedNotes: userNotes,
          userOverrides: {
            preferredStack: stack,
            codingStyle: linesToList(codingStyle),
            designTaste: linesToList(designTaste),
            codingPatterns: linesToList(codingPatterns),
          },
          pastProjectSummaries: summaries,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save memory.");
        return;
      }
      if (data.memory) hydrateForm(data.memory);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Failed to save memory.");
    } finally {
      setSaving(false);
    }
  };

  const removeSummary = (projectId: string) => {
    setSummaries((prev) => prev.filter((s) => s.projectId !== projectId));
  };

  if (loading) {
    return (
      <section className="rounded-xl border border-white/10 bg-[#16161f] p-5">
        <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-gray-400">
          Personal memory
        </h2>
        <p className="text-sm text-gray-500">Loading memory…</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-white/10 bg-[#16161f] p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium uppercase tracking-wide text-gray-400">
            Personal memory
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            RefineAI learns from your projects and chats. Edit anything here to override
            what it remembers.
          </p>
        </div>
        {memory?.lastUpdatedAt && (
          <span className="shrink-0 text-xs text-gray-600">
            Updated {new Date(memory.lastUpdatedAt).toLocaleDateString()}
          </span>
        )}
      </div>

      {saved && (
        <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
          Memory saved.
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-5">
        <div>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
            Preferred stack
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {STACK_FIELDS.map(({ key, label }) => (
              <div key={key}>
                <label className="block text-xs text-gray-500">{label}</label>
                <input
                  type="text"
                  value={stack[key] ?? ""}
                  onChange={(e) =>
                    setStack((s) => ({ ...s, [key]: e.target.value || undefined }))
                  }
                  placeholder={`e.g. ${key === "frontend" ? "React" : "—"}`}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-[#0f0f12] px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-gray-500">
            Coding style
          </label>
          <p className="mb-1 text-xs text-gray-600">One preference per line</p>
          <textarea
            value={codingStyle}
            onChange={(e) => setCodingStyle(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-white/10 bg-[#0f0f12] px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
            placeholder="Flex/grid Tailwind layouts&#10;Rounded card UI"
          />
        </div>

        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-gray-500">
            Design taste
          </label>
          <p className="mb-1 text-xs text-gray-600">One preference per line</p>
          <textarea
            value={designTaste}
            onChange={(e) => setDesignTaste(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-white/10 bg-[#0f0f12] px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
            placeholder="Minimal design&#10;Dark mode preference"
          />
        </div>

        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-gray-500">
            Coding patterns
          </label>
          <p className="mb-1 text-xs text-gray-600">Libraries and conventions — one per line</p>
          <textarea
            value={codingPatterns}
            onChange={(e) => setCodingPatterns(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-white/10 bg-[#0f0f12] px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
            placeholder="Uses lucide-react icons&#10;Section components in src/components/"
          />
        </div>

        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-gray-500">
            Personal instructions
          </label>
          <p className="mb-1 text-xs text-gray-600">
            Pinned notes always included in planning and builds
          </p>
          <textarea
            value={userNotes}
            onChange={(e) => setUserNotes(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-white/10 bg-[#0f0f12] px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
            placeholder="Always use Inter font. Prefer subtle animations."
          />
        </div>

        {summaries.length > 0 && (
          <div>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
              Past project summaries
            </h3>
            <ul className="space-y-2">
              {summaries.map((s) => (
                <li
                  key={s.projectId}
                  className="flex items-start justify-between gap-3 rounded-lg border border-white/5 bg-[#0f0f12] px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white">{s.name}</p>
                    <p className="text-xs text-gray-500">{s.niche}</p>
                    <p className="mt-1 text-xs text-gray-400">{s.summary}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSummary(s.projectId)}
                    className="shrink-0 text-xs text-gray-500 hover:text-red-400"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <button
        type="button"
        disabled={saving}
        onClick={handleSave}
        className="mt-5 w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50 sm:w-auto sm:px-6"
      >
        {saving ? "Saving…" : "Save memory"}
      </button>
    </section>
  );
}
