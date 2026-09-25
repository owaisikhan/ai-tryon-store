"use client";

import { useEffect, useRef, useState } from "react";
import { PRICE_BOUNDS } from "@/app/_lib/catalog";
import { formatPrice } from "@/app/_lib/format-helpers";

const STEP = 10;

// Two range inputs share one track. The thumbs move instantly; the URL
// catches up after the drag pauses.
export default function PriceRangeFilter({ min, max, onChange }) {
  const [range, setRange] = useState([min, max]);
  const [synced, setSynced] = useState([min, max]);
  const timer = useRef(null);

  if (synced[0] !== min || synced[1] !== max) {
    setSynced([min, max]);
    setRange([min, max]);
  }

  useEffect(() => () => clearTimeout(timer.current), []);

  function update(next) {
    setRange(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setSynced(next);
      onChange(next[0], next[1]);
    }, 150);
  }

  const span = PRICE_BOUNDS.max - PRICE_BOUNDS.min;
  const left = ((range[0] - PRICE_BOUNDS.min) / span) * 100;
  const right = ((range[1] - PRICE_BOUNDS.min) / span) * 100;

  return (
    <div>
      <div className="relative h-6">
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-surface-3" />
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-accent"
          style={{ left: `${left}%`, right: `${100 - right}%` }}
        />
        <input
          type="range"
          min={PRICE_BOUNDS.min}
          max={PRICE_BOUNDS.max}
          step={STEP}
          value={range[0]}
          onChange={(e) => update([Math.min(Number(e.target.value), range[1] - STEP), range[1]])}
          aria-label="Minimum price"
          aria-valuetext={formatPrice(range[0])}
          className="range-thumb absolute inset-0 h-6 w-full"
        />
        <input
          type="range"
          min={PRICE_BOUNDS.min}
          max={PRICE_BOUNDS.max}
          step={STEP}
          value={range[1]}
          onChange={(e) => update([range[0], Math.max(Number(e.target.value), range[0] + STEP)])}
          aria-label="Maximum price"
          aria-valuetext={formatPrice(range[1])}
          className="range-thumb absolute inset-0 h-6 w-full"
        />
      </div>
      <div className="mt-2 flex justify-between text-xs font-medium tabular-nums text-muted">
        <span>{formatPrice(range[0])}</span>
        <span>{formatPrice(range[1])}</span>
      </div>
    </div>
  );
}
