"use client";

import HangerIcon from "@/app/_components/ui/HangerIcon";
import { useFittingRoom } from "@/app/_lib/fitting-room/FittingRoomProvider";

export default function OpenFittingRoomButton() {
  const { setOpen } = useFittingRoom();
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="mt-1 inline-flex h-12 items-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-hover"
    >
      <HangerIcon className="size-5" />
      Open the fitting room
    </button>
  );
}
