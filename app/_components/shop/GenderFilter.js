import clsx from "clsx";
import { GENDERS } from "@/app/_lib/catalog";

export default function GenderFilter({ value, onChange }) {
  return (
    <div role="radiogroup" aria-label="Shop for" className="grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1">
      {GENDERS.map((g) => {
        const active = value === g.value;
        return (
          <button
            key={g.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(g.value)}
            className={clsx(
              "h-9 rounded-lg text-[13px] font-semibold transition-colors",
              active ? "bg-accent text-on-accent" : "text-muted hover:text-text",
            )}
          >
            {g.label}
          </button>
        );
      })}
    </div>
  );
}
