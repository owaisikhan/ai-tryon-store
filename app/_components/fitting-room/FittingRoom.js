"use client";

import { useEffect, useState } from "react";
import { RotateCcw, X } from "lucide-react";
import FittingRoomLauncher from "@/app/_components/fitting-room/FittingRoomLauncher";
import ModelPicker from "@/app/_components/fitting-room/ModelPicker";
import ModelStage from "@/app/_components/fitting-room/ModelStage";
import PicksTray from "@/app/_components/fitting-room/PicksTray";
import { useFittingRoom } from "@/app/_lib/fitting-room/FittingRoomProvider";
import { fetchTryOnStatus } from "@/app/_lib/fitting-room/tryon-client";

export default function FittingRoom() {
  const { open, setOpen, picks, startOver } = useFittingRoom();
  const [service, setService] = useState(null);

  // Ask once, on first open, whether the server can run try-ons at all.
  useEffect(() => {
    if (!open || service) return;
    let live = true;
    fetchTryOnStatus().then((status) => live && setService(status));
    return () => {
      live = false;
    };
  }, [open, service]);

  useEffect(() => {
    if (!open) return;
    function onKey(event) {
      if (event.key === "Escape" && !document.querySelector("dialog[open]")) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  if (!open) return <FittingRoomLauncher />;

  return (
    <aside
      aria-label="Fitting room"
      className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] animate-sheet-in flex-col overflow-y-auto rounded-t-2xl border border-border bg-surface shadow-[var(--shadow-panel)] sm:inset-x-auto sm:bottom-4 sm:left-4 sm:w-[340px] sm:rounded-2xl"
    >
      <div className="flex items-start justify-between gap-3 px-4 pb-3 pt-4">
        <div>
          <h2 className="text-base font-semibold">Fitting room</h2>
          <p className="mt-0.5 text-xs text-muted">Tap the hanger on any product, or drag it onto the model.</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close fitting room"
          className="-mr-2 -mt-2 grid size-11 shrink-0 place-items-center rounded-lg text-muted hover:text-text"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="flex flex-col gap-4 px-4">
        {service && !service.ready && (
          <p className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs text-muted">
            Try-on is offline right now, but you can still pick pieces.
          </p>
        )}
        <ModelStage mock={service?.mock} />
        <ModelPicker />
        <PicksTray />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border-soft px-4 py-3">
        <p className="text-xs text-subtle">Add another piece and it goes on top.</p>
        <button
          type="button"
          onClick={startOver}
          disabled={picks.length === 0}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-accent-text hover:underline disabled:opacity-40 disabled:hover:no-underline"
        >
          <RotateCcw className="size-3.5" aria-hidden="true" />
          Start over
        </button>
      </div>
    </aside>
  );
}
