"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from "react";

type SnapPoint = "closed" | "half" | "full";

type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  defaultSnap?: SnapPoint;
};

const SNAP_HEIGHTS: Record<SnapPoint, string> = {
  closed: "0%",
  half: "50%",
  full: "90%",
};

export default function BottomSheet({
  open,
  onClose,
  title,
  children,
  defaultSnap = "half",
}: BottomSheetProps) {
  const [snap, setSnap] = useState<SnapPoint>(defaultSnap);
  const [dragOffset, setDragOffset] = useState(0);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startOffset = useRef(0);

  useEffect(() => {
    if (open) setSnap(defaultSnap);
  }, [open, defaultSnap]);

  const handlePointerDown = (e: ReactPointerEvent) => {
    dragging.current = true;
    startY.current = e.clientY;
    startOffset.current = dragOffset;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: ReactPointerEvent) => {
    if (!dragging.current) return;
    const delta = e.clientY - startY.current;
    setDragOffset(Math.max(0, startOffset.current + delta));
  };

  const handlePointerUp = () => {
    if (!dragging.current) return;
    dragging.current = false;
    if (dragOffset > 120) {
      onClose();
      setDragOffset(0);
      setSnap("closed");
    } else if (dragOffset > 40) {
      setSnap("half");
      setDragOffset(0);
    } else {
      setDragOffset(0);
    }
  };

  const handleBackdropClick = useCallback(() => {
    onClose();
    setSnap("closed");
    setDragOffset(0);
  }, [onClose]);

  if (!open) return null;

  const height = snap === "closed" ? SNAP_HEIGHTS.half : SNAP_HEIGHTS[snap];

  return (
    <>
      <button
        type="button"
        aria-label="Close sheet"
        className="fixed inset-0 z-40 bg-black/60"
        onClick={handleBackdropClick}
      />
      <div
        className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-2xl border-t border-white/10 bg-surface-raised pb-safe motion-safe:animate-slide-up"
        style={{
          height: `calc(${height} + ${dragOffset}px)`,
          maxHeight: "90vh",
          transition: dragging.current ? "none" : "height 0.35s cubic-bezier(0.32, 0.72, 0, 1)",
        }}
        role="dialog"
        aria-modal="true"
      >
        <div
          className="flex shrink-0 cursor-grab flex-col items-center py-3 active:cursor-grabbing"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <div className="h-1 w-10 rounded-full bg-gray-600" />
          {title && <p className="mt-2 text-sm font-medium text-white">{title}</p>}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </>
  );
}
