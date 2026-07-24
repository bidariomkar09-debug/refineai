"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type MobileHeaderProps = {
  onMenuClick?: () => void;
  rightSlot?: ReactNode;
  centerSlot?: ReactNode;
  showLogo?: boolean;
  title?: string;
  /** Pulsing building indicator next to logo */
  building?: boolean;
};

export default function MobileHeader({
  onMenuClick,
  rightSlot,
  centerSlot,
  showLogo = true,
  title,
  building = false,
}: MobileHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-[#0f0f12]/95 px-4 py-3 pt-safe backdrop-blur md:hidden">
      <div className="flex min-w-0 items-center gap-2">
        {showLogo ? (
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="relative text-xl font-light text-indigo-500">
              ∞
              {building && (
                <span className="absolute -right-0.5 -top-0.5 flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full motion-safe:animate-ping rounded-full bg-indigo-400 opacity-60" />
                  <span className="relative h-2 w-2 rounded-full bg-indigo-400" />
                </span>
              )}
            </span>
            <span className="text-base font-semibold tracking-tight text-white">
              Refine<span className="text-indigo-500">AI</span>
            </span>
          </Link>
        ) : title ? (
          <h1 className="truncate text-base font-semibold text-white">{title}</h1>
        ) : null}
      </div>

      {centerSlot && <div className="flex shrink-0 items-center">{centerSlot}</div>}

      <div className="flex items-center gap-1">
        {rightSlot}
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            className="touch-target touch-press rounded-lg p-2 text-gray-400 hover:bg-white/5"
            aria-label="Open menu"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
        )}
      </div>
    </header>
  );
}
