"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import SidebarNav from "./SidebarNav";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#0f0f12] text-gray-100">
      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-white/10 bg-[#12121a] transition-transform duration-300 lg:static lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
          <Link href="/dashboard" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
            <span className="text-2xl font-light text-indigo-500">∞</span>
            <span className="text-lg font-semibold tracking-tight">
              Refine<span className="text-indigo-500">AI</span>
            </span>
          </Link>
          <button
            type="button"
            className="rounded-lg p-1.5 text-gray-400 hover:bg-white/5 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close sidebar"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <SidebarNav activePath={pathname} onNavigate={() => setMobileOpen(false)} />

        <div className="mt-auto border-t border-white/10 p-4">
          <Link
            href="/workspace"
            onClick={() => setMobileOpen(false)}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Project
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-white/10 bg-[#0f0f12]/90 px-4 py-3 backdrop-blur lg:px-8">
          <button
            type="button"
            className="rounded-lg p-2 text-gray-400 hover:bg-white/5 lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
        </header>

        <main className="flex-1 motion-safe:animate-fade-in p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
