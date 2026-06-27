"use client";

import type { ReactNode } from "react";

type SlideDrawerProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  side?: "left" | "right";
  widthClass?: string;
};

export default function SlideDrawer({
  open,
  onClose,
  children,
  side = "left",
  widthClass = "w-72",
}: SlideDrawerProps) {
  if (!open) return null;

  const positionClass = side === "left" ? "left-0 animate-slide-in-right" : "right-0";

  return (
    <>
      <button
        type="button"
        aria-label="Close menu"
        className="fixed inset-0 z-40 bg-black/60"
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 z-50 flex h-full flex-col border-white/10 bg-[#12121a] ${positionClass} ${widthClass} ${
          side === "left" ? "border-r" : "border-l"
        }`}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </aside>
    </>
  );
}
