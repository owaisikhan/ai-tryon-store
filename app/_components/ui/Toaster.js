"use client";

import { X } from "lucide-react";
import { dismissToast, useToasts } from "@/app/_lib/stores/toast-store";

export default function Toaster() {
  const toasts = useToasts();

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-20 z-[70] flex flex-col items-center gap-2 px-4"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`pointer-events-auto flex max-w-md animate-toast-in items-center gap-3 rounded-xl border px-4 py-2.5 text-sm font-medium shadow-[var(--shadow-float)] ${
            t.tone === "error"
              ? "border-danger/30 bg-danger-soft text-danger"
              : "border-border bg-surface-2 text-text"
          }`}
        >
          <span>{t.message}</span>
          <button
            type="button"
            onClick={() => dismissToast(t.id)}
            className="-mr-1.5 grid size-7 place-items-center rounded-md text-muted hover:text-text"
            aria-label="Dismiss"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
