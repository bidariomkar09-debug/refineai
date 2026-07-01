"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

type MenuPosition = { bottom: number; left: number; minWidth: number };

export default function ModeSwitcher({ mode, onModeChange }: ModeSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<MenuPosition | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const meta = MODE_META[mode];
  const ActiveIcon = ICONS[mode];

  const updateMenuPosition = () => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    setMenuPos({
      bottom: window.innerHeight - rect.top + 6,
      left: rect.left,
      minWidth: Math.max(rect.width, 168),
    });
  };

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
    updateMenuPosition();
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        !rootRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onReposition = () => updateMenuPosition();
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open]);

  const selectMode = (id: ChatMode) => {
    onModeChange(id);
    setOpen(false);
  };

  const menu =
    open && menuPos
      ? createPortal(
          <div
            ref={menuRef}
            role="listbox"
            aria-label="Chat mode"
            style={{
              position: "fixed",
              bottom: menuPos.bottom,
              left: menuPos.left,
              minWidth: menuPos.minWidth,
            }}
            className="z-[9999] overflow-hidden rounded-lg border border-white/10 bg-[#252526] py-1 shadow-2xl shadow-black/50"
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
                  className={`flex w-full items-center gap-2.5 px-2.5 py-2 text-left text-sm transition ${
                    selected ? "bg-white/5 text-white" : `text-gray-300 ${item.menuHover}`
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${item.iconBg}`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="flex-1 font-medium">{item.label}</span>
                  {selected && (
                    <CheckIcon className={`h-3.5 w-3.5 shrink-0 ${item.accentText}`} />
                  )}
                </button>
              );
            })}
          </div>,
          document.body
        )
      : null;

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition ${meta.accentBorder} ${meta.accentBg} hover:brightness-110`}
      >
        <span
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded ${meta.iconBg}`}
        >
          <ActiveIcon className="h-3.5 w-3.5" />
        </span>
        <span className={`font-medium ${meta.accentText}`}>{meta.label}</span>
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
      {menu}
    </div>
  );
}
