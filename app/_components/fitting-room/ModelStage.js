"use client";

import Image from "next/image";
import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import clsx from "clsx";
import { ZoomIn } from "lucide-react";
import TryOnError from "@/app/_components/fitting-room/TryOnError";
import ZoomDialog from "@/app/_components/fitting-room/ZoomDialog";
import Spinner from "@/app/_components/ui/Spinner";
import { useFittingRoom } from "@/app/_lib/fitting-room/FittingRoomProvider";

// The model photo: the drop target, the loading state and the result.
export default function ModelStage({ mock }) {
  const { tryOn, activeModel, dragging } = useFittingRoom();
  const { setNodeRef, isOver } = useDroppable({ id: "fitting-room-stage" });
  const [zoomed, setZoomed] = useState(false);
  const src = tryOn.image ?? activeModel.image;
  const loading = tryOn.status === "loading";
  const { done, total } = tryOn.progress;

  return (
    <div
      ref={setNodeRef}
      data-fly-target="stage"
      className={clsx(
        "relative mx-auto aspect-[3/4] w-full max-w-[min(100%,calc(46dvh*0.75))] overflow-hidden rounded-xl bg-studio transition-shadow",
        dragging && "ring-2 ring-accent/50",
        isOver && "ring-4 ring-accent",
      )}
    >
      <Image
        src={src}
        alt={`${activeModel.name}${total ? " wearing your picks" : ""}`}
        fill
        sizes="340px"
        unoptimized={src.startsWith("data:")}
        className={clsx("object-contain transition-[filter,opacity] duration-300", loading && "opacity-60 brightness-50")}
      />

      {mock && (
        <span className="absolute left-2 top-2 rounded-md bg-black/65 px-2 py-1 text-[11px] font-semibold text-white">
          Mock preview
        </span>
      )}

      {dragging && (
        <div
          className={clsx(
            "absolute inset-0 grid place-items-center bg-black/35 transition-opacity",
            isOver ? "opacity-100" : "opacity-70",
          )}
        >
          <p className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-on-accent">Drop to try it on</p>
        </div>
      )}

      {loading && !dragging && (
        <div aria-live="polite" className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center text-white">
          <Spinner className="size-7 text-accent" />
          <p className="mt-2 text-sm font-semibold">Dressing your model</p>
          <p className="text-xs text-white/80">
            The photo is being made for you. It takes a moment.
            {total > 1 && <span className="mt-1 block tabular-nums">Piece {done + 1} of {total}</span>}
          </p>
        </div>
      )}

      {tryOn.status === "error" && !dragging && (
        <TryOnError key={tryOn.errorKey} error={tryOn.error} onRetry={tryOn.retry} />
      )}

      {tryOn.status !== "error" && (
        <button
          type="button"
          onClick={() => setZoomed(true)}
          aria-label="Enlarge photo"
          className="absolute bottom-2 right-2 grid size-10 place-items-center rounded-full bg-black/55 text-white transition-colors hover:bg-black/75"
        >
          <ZoomIn className="size-[18px]" />
        </button>
      )}

      <ZoomDialog open={zoomed} onClose={() => setZoomed(false)} src={src} alt={activeModel.name} />
    </div>
  );
}
