"use client";

import Image from "next/image";
import { useDroppable } from "@dnd-kit/core";
import clsx from "clsx";
import Spinner from "@/app/_components/ui/Spinner";
import { useFittingRoom } from "@/app/_lib/fitting-room/FittingRoomProvider";

// The collapsed fitting room: a pill in the corner showing the current look.
export default function FittingRoomLauncher() {
  const { setOpen, tryOn, picks, activeModel } = useFittingRoom();
  const { setNodeRef, isOver } = useDroppable({ id: "fitting-room-launcher" });
  const src = tryOn.image ?? activeModel.image;

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={() => setOpen(true)}
      className={clsx(
        "fixed bottom-4 left-4 z-50 flex h-14 items-center gap-3 rounded-full border bg-surface-2 py-1.5 pl-1.5 pr-5 shadow-[var(--shadow-float)] transition-colors hover:border-accent/50",
        isOver ? "border-accent" : "border-border",
      )}
    >
      <span className="relative size-11 overflow-hidden rounded-full bg-studio">
        <Image src={src} alt="" fill sizes="44px" unoptimized={src.startsWith("data:")} className="object-cover object-top" />
        {tryOn.status === "pending" && (
          <span className="absolute inset-0 grid place-items-center bg-black/40 text-white">
            <Spinner className="size-4" />
          </span>
        )}
      </span>
      <span className="text-sm font-semibold">Try it on</span>
      {picks.length > 0 && (
        <span className="grid size-6 place-items-center rounded-full bg-accent text-xs font-bold text-on-accent">
          {picks.length}
        </span>
      )}
    </button>
  );
}
