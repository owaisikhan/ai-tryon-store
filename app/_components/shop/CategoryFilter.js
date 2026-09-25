import Image from "next/image";
import clsx from "clsx";
import { LayoutGrid } from "lucide-react";
import { CATEGORIES, categoryThumb } from "@/app/_lib/catalog";

export default function CategoryFilter({ value, counts, onChange }) {
  const items = [{ slug: "all", label: "All categories" }, ...CATEGORIES];
  return (
    <ul className="-mx-2 flex flex-col gap-0.5">
      {items.map((c) => {
        const active = value === c.slug;
        const thumb = c.slug === "all" ? null : categoryThumb(c.slug);
        const count = counts[c.slug] ?? 0;
        return (
          <li key={c.slug}>
            <button
              type="button"
              onClick={() => onChange(c.slug)}
              aria-pressed={active}
              className={clsx(
                "flex h-11 w-full items-center gap-3 rounded-xl px-2 text-left text-sm transition-colors",
                active ? "bg-accent-soft font-semibold text-text" : "text-muted hover:bg-surface-2 hover:text-text",
              )}
            >
              <span className="grid size-7 shrink-0 place-items-center">
                {thumb ? (
                  <Image src={thumb} alt="" width={28} height={28} className="size-7 object-contain" />
                ) : (
                  <LayoutGrid className={clsx("size-4", active ? "text-accent-text" : "text-subtle")} aria-hidden="true" />
                )}
              </span>
              <span className="flex-1 truncate">{c.label}</span>
              <span className="text-xs tabular-nums text-subtle">{count}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
