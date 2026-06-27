"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import BottomNav from "@/app/components/mobile/BottomNav";
import MobileHeader from "@/app/components/mobile/MobileHeader";
import SlideDrawer from "@/app/components/mobile/SlideDrawer";
import SidebarNav from "./SidebarNav";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tabletExpanded, setTabletExpanded] = useState(false);

  const closeDrawer = () => {
    setDrawerOpen(false);
    setTabletExpanded(false);
  };

  return (
    <div className="flex min-h-dvh bg-[#0f0f12] text-gray-100">
      {/* Desktop sidebar lg+ */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-white/10 bg-[#12121a] lg:flex">
        <SidebarBrand onNavigate={closeDrawer} />
        <SidebarNav activePath={pathname} onNavigate={closeDrawer} />
        <NewProjectButton onNavigate={closeDrawer} />
      </aside>

      {/* Tablet icon rail md–lg */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[60px] flex-col items-center border-r border-white/10 bg-[#12121a] py-4 md:flex lg:hidden">
        <button
          type="button"
          onClick={() => setTabletExpanded(true)}
          className="touch-target touch-press mb-4 rounded-lg p-2 text-indigo-400 hover:bg-white/5"
          aria-label="Expand menu"
        >
          <span className="text-xl font-light">∞</span>
        </button>
        <SidebarNav activePath={pathname} collapsed onNavigate={() => setTabletExpanded(true)} />
        <Link
          href="/workspace"
          className="touch-target mt-auto rounded-lg p-2 text-indigo-400 hover:bg-white/5"
          aria-label="New project"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </Link>
      </aside>

      {/* Mobile drawer + tablet expanded drawer */}
      <SlideDrawer open={drawerOpen || tabletExpanded} onClose={closeDrawer} widthClass="w-64">
        <div className="flex h-full flex-col">
          <SidebarBrand onNavigate={closeDrawer} showClose onClose={closeDrawer} />
          <SidebarNav activePath={pathname} onNavigate={closeDrawer} />
          <NewProjectButton onNavigate={closeDrawer} />
        </div>
      </SlideDrawer>

      {/* Main content */}
      <div className="flex min-h-dvh flex-1 flex-col md:pl-[60px] lg:pl-0">
        <MobileHeader onMenuClick={() => setDrawerOpen(true)} />

        <main className="flex-1 overflow-x-hidden motion-safe:animate-fade-in p-4 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-4 lg:p-8 lg:pb-8">
          {children}
        </main>

        <BottomNav />
      </div>
    </div>
  );
}

function SidebarBrand({
  onNavigate,
  showClose,
  onClose,
}: {
  onNavigate?: () => void;
  showClose?: boolean;
  onClose?: () => void;
}) {
  return (
    <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
      <Link href="/dashboard" className="flex items-center gap-2" onClick={onNavigate}>
        <span className="text-2xl font-light text-indigo-500">∞</span>
        <span className="text-lg font-semibold tracking-tight">
          Refine<span className="text-indigo-500">AI</span>
        </span>
      </Link>
      {showClose && onClose && (
        <button
          type="button"
          className="touch-target rounded-lg p-1.5 text-gray-400 hover:bg-white/5"
          onClick={onClose}
          aria-label="Close sidebar"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

function NewProjectButton({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="mt-auto border-t border-white/10 p-4">
      <Link
        href="/workspace"
        onClick={onNavigate}
        className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        New Project
      </Link>
    </div>
  );
}
