"use client";

import { useEffect, useState } from "react";
import { requestTryOn } from "@/app/_lib/fitting-room/tryon-client";

/*
  Turns (model, chain of garments) into a photo, one garment per request.

  results maps "modelKey|id1,id2" to the photo of that prefix. Each render
  finds the longest prefix already made; the effect makes exactly the next
  one. When it lands, the next render finds a longer prefix and the effect
  runs again, until the whole chain is made. So:
    - removing the last piece shows the previous photo instantly;
    - every step is one Gemini edit, with visible progress;
    - a changed chain aborts only the request that no longer matters.
*/
export function useTryOn({ modelKey, base, baseImage, chain, enabled }) {
  const [results, setResults] = useState({});
  const [failure, setFailure] = useState(null);
  const [attempt, setAttempt] = useState(0);

  const total = chain.length;
  const prefixKey = (len) => `${modelKey}|${chain.slice(0, len).join(",")}`;

  let done = total;
  while (done > 0 && !results[prefixKey(done)]) done--;

  const image = done > 0 ? results[prefixKey(done)] : baseImage;
  const targetKey = done < total ? prefixKey(done + 1) : null;
  const failureKey = targetKey ? `${targetKey}#${attempt}` : null;
  const error = failure && failure.key === failureKey ? failure.error : null;
  const working = Boolean(targetKey) && !error;

  const garmentId = working && enabled ? chain[done] : null;
  const stepBaseType = done === 0 ? base.type : "image";
  const stepBaseValue = done === 0 ? (base.type === "preset" ? base.id : base.image) : image;

  useEffect(() => {
    if (!garmentId) return;
    const controller = new AbortController();
    const stepBase =
      stepBaseType === "preset" ? { type: "preset", id: stepBaseValue } : { type: "image", image: stepBaseValue };

    requestTryOn({ base: stepBase, garmentIds: [garmentId], signal: controller.signal })
      .then((data) => setResults((prev) => ({ ...prev, [targetKey]: data.image })))
      .catch((err) => {
        if (!controller.signal.aborted) setFailure({ key: failureKey, error: err });
      });

    return () => controller.abort();
  }, [garmentId, targetKey, failureKey, stepBaseType, stepBaseValue]);

  return {
    image,
    // "pending": pieces are waiting but the panel is closed, so nothing runs.
    status: error ? "error" : working ? (enabled ? "loading" : "pending") : "idle",
    error,
    // Changes with every new failure, so the error view can be keyed on it.
    errorKey: error ? failureKey : null,
    progress: { done, total },
    retry: () => setAttempt((n) => n + 1),
  };
}
