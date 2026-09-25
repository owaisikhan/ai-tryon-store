import { ChevronDown } from "lucide-react";
import { SORTS } from "@/app/_lib/filters";

export default function SortMenu({ value, onChange }) {
  return (
    <div className="relative">
      <label htmlFor="sort" className="sr-only">
        Sort by
      </label>
      <select
        id="sort"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 appearance-none rounded-xl border border-border-soft bg-surface pl-4 pr-10 text-sm font-medium text-text outline-none hover:border-border focus:border-accent/60"
      >
        {SORTS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden="true" />
    </div>
  );
}
