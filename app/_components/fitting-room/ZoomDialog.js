"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";

export default function ZoomDialog({ open, onClose, src, alt }) {
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
      aria-label="Enlarged photo"
      className="m-auto max-h-none max-w-none bg-transparent p-0 backdrop:bg-black/80"
    >
      {open && (
        <div className="relative aspect-[3/4] h-[min(90dvh,calc(94vw*4/3))] overflow-hidden rounded-2xl bg-studio">
          <Image src={src} alt={alt} fill sizes="90vh" unoptimized={src.startsWith("data:")} className="object-contain" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 grid size-11 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"
          >
            <X className="size-5" />
          </button>
        </div>
      )}
    </dialog>
  );
}
