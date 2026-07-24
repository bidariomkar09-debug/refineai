"use client";

import { useEffect, useState } from "react";

export type ToastItem = {
  id: string;
  message: string;
  retry?: boolean;
};

type ToastStackProps = {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
};

export default function ToastStack({ toasts, onDismiss }: ToastStackProps) {
  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-50 flex max-w-sm flex-col gap-2"
      data-testid="toast-stack"
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 5000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div
      className={`pointer-events-auto rounded-lg border px-4 py-3 text-sm shadow-lg motion-safe:animate-fade-in ${
        toast.retry
          ? "border-amber-500/40 bg-amber-500/10 text-amber-100"
          : "border-surface-border bg-surface-raised text-gray-200"
      }`}
      role="status"
    >
      {toast.message}
    </div>
  );
}

export function useToastStack() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pushToast = (message: string, retry = false) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((prev) => [...prev, { id, message, retry }]);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return { toasts, pushToast, dismissToast };
}
