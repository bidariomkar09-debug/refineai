"use client";

import { useState } from "react";

type DogfoodNotesProps = {
  projectId: string;
  prompt: string;
};

export default function DogfoodNotes({ projectId, prompt }: DogfoodNotesProps) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    const trimmed = note.trim();
    if (!trimmed) return;
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dogfood_entry: {
            projectId,
            prompt,
            note: trimmed,
            createdAt: new Date().toISOString(),
          },
        }),
      });
      if (res.ok) {
        setSaved(true);
        setNote("");
        setTimeout(() => setSaved(false), 2500);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
      <label className="block text-xs font-medium uppercase tracking-wide text-gray-500">
        What broke or felt wrong?
      </label>
      <p className="mb-2 text-xs text-gray-600">Log it now — fix it tomorrow</p>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="Preview didn't load, Hero section missing copy…"
        className="w-full rounded-lg border border-white/10 bg-[#0f0f12] px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-indigo-500 focus:outline-none"
      />
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !note.trim()}
          className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-300 transition hover:border-indigo-500 hover:text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save note"}
        </button>
        {saved && <span className="text-xs text-emerald-400">Saved to dogfood log</span>}
      </div>
    </div>
  );
}
