"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMode } from "@/app/lib/agentTypes";
import { CHAT_MODES, MODE_META, cycleMode } from "@/app/lib/chatModes";

type ModeSwitcherProps = {
  mode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
};

function AgentIcon({ className }: { className?: string }) {
  return (
    <span className={`font-light leading-none ${className ?? "text-sm"}`} aria-hidden>
      ∞
    </span>
  );
}

function AskIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
      />
    </svg>
  );
}

function PlanIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
      />
    </svg>
  );
}

function DebugIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 12.75c1.148 0 2.278.08 3.383.237 1.037.146 1.866.966 1.866 2.013 0 3.728-2.35 6.75-5.25 6.75S6.75 18.728 6.75 15c0-1.046.83-1.867 1.866-2.013A24.204 24.204 0 0112 12.75zm0 0c2.883 0 5.647.508 8.207 1.44a23.91 23.91 0 01-1.152 6.06M12 12.75c-2.883 0-5.647.508-8.208 1.44.125 2.104.52 4.136 1.153 6.06M12 12.75a2.25 2.25 0 002.248-2.354M12 12.75a2.25 2.25 0 01-2.248-2.354M12 8.25c.995-.611 1.163-1.979 1.163-2.354 0-.375-.168-1.743-1.163-2.354M12 8.25c-.995-.611-1.163-1.979-1.163-2.354 0-.375.168-1.743 1.163-2.354"
      />
    </svg>
  );
}

const ICONS: Record<ChatMode, typeof AgentIcon> = {
  agent: AgentIcon,
  ask: AskIcon,
  plan: PlanIcon,
  debug: DebugIcon,
};

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default function ModeSwitcher({ mode, onModeChange }: ModeSwitcherProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const meta = MODE_META[mode];
  const ActiveIcon = ICONS[mode];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "m") {
        e.preventDefault();
        onModeChange(cycleMode(mode));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mode, onModeChange]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  const selectMode = (id: ChatMode) => {
    onModeChange(id);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-gray-400 transition hover:bg-white/5 hover:text-gray-200"
      >
        <ActiveIcon className="h-3.5 w-3.5 shrink-0 text-gray-300" />
        <span className="font-medium text-gray-300">{meta.label}</span>
        <svg
          className={`h-3 w-3 shrink-0 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Chat mode"
          className="absolute bottom-full left-0 z-50 mb-1.5 min-w-[10.5rem] overflow-hidden rounded-lg border border-surface-border bg-[#1e1e1e] py-1 shadow-2xl"
        >
          {CHAT_MODES.map((id) => {
            const item = MODE_META[id];
            const Icon = ICONS[id];
            const selected = mode === id;
            return (
              <button
                key={id}
                type="button"
                role="option"
                aria-selected={selected}
                title={item.description}
                onClick={() => selectMode(id)}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition hover:bg-white/5 ${
                  selected ? "text-white" : "text-gray-300"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0 text-gray-400" />
                <span className="flex-1">{item.label}</span>
                {selected && <CheckIcon className="h-3.5 w-3.5 shrink-0 text-indigo-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
