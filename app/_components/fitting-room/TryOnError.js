"use client";

import { useEffect, useState } from "react";
import { CircleAlert, RotateCcw } from "lucide-react";

// Failure stays where it happened. A rate limit counts down before Retry
// comes back, so the shopper is not tempted to hammer it.
export default function TryOnError({ error, onRetry }) {
  const [now, setNow] = useState(() => Date.now());
  const [startedAt] = useState(() => Date.now());
  const waitUntil = error.retryAfter ? startedAt + error.retryAfter * 1000 : 0;
  const secondsLeft = Math.max(0, Math.ceil((waitUntil - now) / 1000));

  useEffect(() => {
    if (!waitUntil) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [waitUntil]);

  return (
    <div
      role="alert"
      className="absolute inset-x-3 bottom-3 flex flex-col gap-2 rounded-xl border border-danger/30 bg-surface/95 p-3 text-sm shadow-[var(--shadow-float)]"
    >
      <p className="flex items-start gap-2 text-text">
        <CircleAlert className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />
        <span>{error.message}</span>
      </p>
      {error.hint && <p className="rounded-lg bg-surface-2 px-2.5 py-1.5 text-xs text-muted">Dev note: {error.hint}</p>}
      <button
        type="button"
        onClick={onRetry}
        disabled={secondsLeft > 0}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-on-accent hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-surface-3 disabled:text-muted"
      >
        <RotateCcw className="size-4" aria-hidden="true" />
        {secondsLeft > 0 ? `Try again in ${secondsLeft}s` : "Try again"}
      </button>
    </div>
  );
}
