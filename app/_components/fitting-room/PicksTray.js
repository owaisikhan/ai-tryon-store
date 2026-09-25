"use client";

import Image from "next/image";
import { useDroppable } from "@dnd-kit/core";
import clsx from "clsx";
import { X } from "lucide-react";
import Spinner from "@/app/_components/ui/Spinner";
import { useFittingRoom } from "@/app/_lib/fitting-room/FittingRoomProvider";
import { pluralize } from "@/app/_lib/format-helpers";

export default function PicksTray() {
  const { picks, chain, tryOn, removePiece, dragging } = useFittingRoom();
  const { setNodeRef, isOver } = useDroppable({ id: "fitting-room-tray" });
  const workingId = tryOn.status === "loading" ? chain[tryOn.progress.done] : null;

  return (
    <div ref={setNodeRef}>
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="text-xs font-semibold text-muted">Your picks</h3>
        <span className="text-xs tabular-nums text-subtle">{pluralize(picks.length, "piece")}</span>
      </div>

      {picks.length === 0 ? (
        <p
          className={clsx(
            "rounded-xl border border-dashed px-3 py-3.5 text-center text-xs text-muted transition-colors",
            isOver ? "border-accent bg-accent-soft" : dragging ? "border-accent/60" : "border-border",
          )}
        >
          Drag a piece here, or tap any product.
        </p>
      ) : (
        <ul className={clsx("flex flex-wrap gap-2 rounded-xl p-1 transition-colors", isOver && "bg-accent-soft")}>
          {picks.map((p) => (
            <li key={p.id} className="relative animate-pop-in">
              <div className="relative size-12 overflow-hidden rounded-lg bg-surface-2" title={p.name}>
                <Image src={p.image} alt={p.name} fill sizes="48px" className="object-contain p-1" />
                {workingId === p.id && (
                  <span className="absolute inset-0 grid place-items-center bg-black/55 text-accent">
                    <Spinner className="size-4" />
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => removePiece(p.id)}
                aria-label={`Take off ${p.name}`}
                className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full border border-border bg-surface-3 text-muted after:absolute after:-inset-2.5 hover:text-text"
              >
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
