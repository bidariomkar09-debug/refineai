"use client";

import { useRef, useState, type ReactNode } from "react";

type SwipeableRowProps = {
  children: ReactNode;
  onDelete: () => void;
  deleteLabel?: string;
};

export default function SwipeableRow({
  children,
  onDelete,
  deleteLabel = "Delete",
}: SwipeableRowProps) {
  const [offset, setOffset] = useState(0);
  const startX = useRef(0);
  const dragging = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    dragging.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragging.current) return;
    const delta = e.touches[0].clientX - startX.current;
    if (delta < 0) setOffset(Math.max(delta, -80));
  };

  const handleTouchEnd = () => {
    dragging.current = false;
    setOffset(offset < -40 ? -80 : 0);
  };

  return (
    <div className="relative overflow-hidden rounded-xl">
      <div className="absolute inset-y-0 right-0 flex w-20 items-center justify-center bg-red-600">
        <button
          type="button"
          onClick={onDelete}
          className="touch-target text-sm font-medium text-white"
        >
          {deleteLabel}
        </button>
      </div>
      <div
        className="relative bg-[#16161f] transition-transform duration-200"
        style={{ transform: `translateX(${offset}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
