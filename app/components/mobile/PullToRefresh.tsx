"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";

type PullToRefreshProps = {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
};

export default function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [pulling, setPulling] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (refreshing || !containerRef.current || containerRef.current.scrollTop > 0) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0) setPulling(Math.min(delta, 80));
  };

  const handleTouchEnd = useCallback(async () => {
    if (pulling >= 60 && !refreshing) {
      setRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    }
    setPulling(0);
  }, [pulling, refreshing, onRefresh]);

  return (
    <div
      ref={containerRef}
      className="relative overflow-y-auto"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {(pulling > 0 || refreshing) && (
        <div
          className="flex items-center justify-center text-sm text-indigo-400 transition-all"
          style={{ height: refreshing ? 40 : pulling * 0.5 }}
        >
          {refreshing ? "Refreshing..." : pulling >= 60 ? "Release to refresh" : "Pull to refresh"}
        </div>
      )}
      {children}
    </div>
  );
}
