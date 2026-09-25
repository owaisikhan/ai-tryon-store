"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import clsx from "clsx";
import { ImageUp } from "lucide-react";
import Spinner from "@/app/_components/ui/Spinner";
import { useFittingRoom } from "@/app/_lib/fitting-room/FittingRoomProvider";
import { prepareUploadedPhoto } from "@/app/_lib/fitting-room/image-utils";
import { toast } from "@/app/_lib/stores/toast-store";

const tile = "relative h-[60px] w-[45px] shrink-0 overflow-hidden rounded-lg bg-studio transition-shadow";

export default function ModelPicker() {
  const { models, activeModel, selectModel, upload, setUploadedPhoto } = useFittingRoom();
  const inputRef = useRef(null);
  const [reading, setReading] = useState(false);

  async function handleFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setReading(true);
    try {
      setUploadedPhoto(await prepareUploadedPhoto(file));
    } catch (error) {
      toast(error.message, { tone: "error", duration: 5000 });
    } finally {
      setReading(false);
    }
  }

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="text-xs font-semibold text-muted">Model</h3>
        <span className="text-xs text-subtle">{activeModel.name}</span>
      </div>
      <div role="radiogroup" aria-label="Choose a model" className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 py-1 pr-6 [mask-image:linear-gradient(to_right,black_calc(100%-2rem),transparent)]">
        {upload && (
          <button
            type="button"
            role="radio"
            aria-checked={activeModel.id === "upload"}
            aria-label="Your photo"
            onClick={() => selectModel("upload")}
            className={clsx(tile, activeModel.id === "upload" ? "ring-2 ring-accent" : "ring-1 ring-border hover:ring-muted")}
          >
            <Image src={upload.dataUrl} alt="" fill sizes="45px" unoptimized className="object-cover" />
          </button>
        )}
        {models.map((m) => {
          const active = activeModel.id === m.id;
          return (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={`${m.name}, ${m.gender === "women" ? "women's" : "men's"} fit, ${m.bodyType}`}
              title={m.name}
              onClick={() => selectModel(m.id)}
              className={clsx(tile, active ? "ring-2 ring-accent" : "ring-1 ring-border hover:ring-muted")}
            >
              <Image src={m.image} alt="" fill sizes="45px" className="object-cover" />
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={reading}
          className={clsx(
            tile,
            "flex flex-col items-center justify-center gap-1 border border-dashed border-border bg-surface-2 text-muted hover:border-accent/60 hover:text-text",
          )}
        >
          {reading ? <Spinner className="size-4" /> : <ImageUp className="size-4" aria-hidden="true" />}
          <span className="text-[9px] font-semibold leading-tight">Upload</span>
          <span className="sr-only">your photo</span>
        </button>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} className="hidden" />
      </div>
      {activeModel.id === "upload" && (
        <p className="mt-2 text-[11px] leading-snug text-subtle">
          Your photo is used only for these try-ons. It goes to Google Gemini and a short-lived server cache, never a
          public gallery. A full-body photo against a plain wall works best.
        </p>
      )}
    </div>
  );
}
