"use client";

import { useEffect, useRef } from "react";
import clsx from "clsx";
import { X } from "lucide-react";

// A side sheet on the native <dialog>: focus trap, Escape and the top layer
// come from the browser. Page scroll is locked in globals.css while open.
export default function Drawer({ open, onClose, side = "right", title, children, footer }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-label={title}
      className={clsx(
        "fixed top-0 m-0 h-dvh max-h-none w-[min(92vw,400px)] max-w-none bg-surface p-0 text-text backdrop:bg-black/60",
        side === "right" ? "left-auto right-0 border-l border-border" : "left-0 right-auto border-r border-border",
      )}
    >
      <div className="flex h-full flex-col">
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border-soft px-5">
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 grid size-11 place-items-center rounded-lg text-muted hover:text-text"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && <div className="shrink-0 border-t border-border-soft px-5 py-4">{footer}</div>}
      </div>
    </dialog>
  );
}
