import clsx from "clsx";
import { Star } from "lucide-react";
import { RATINGS } from "@/app/_lib/filters";

export default function RatingFilter({ value, onChange }) {
  return (
    <div role="radiogroup" aria-label="Minimum rating" className="flex flex-wrap gap-2">
      {RATINGS.map((r) => {
        const active = value === r.value;
        return (
          <button
            key={r.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(r.value)}
            className={clsx(
              "inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors",
              active ? "border-accent/60 bg-accent-soft text-text" : "border-border-soft text-muted hover:text-text",
            )}
          >
            {r.value > 0 && <Star className="size-3.5 fill-star text-star" aria-hidden="true" />}
            {r.label}
          </button>
        );
      })}
    </div>
  );
}
