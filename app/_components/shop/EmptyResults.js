import { SearchX } from "lucide-react";

export default function EmptyResults({ onReset, saved }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-border px-6 py-16 text-center">
      <SearchX className="size-8 text-subtle" aria-hidden="true" />
      <h2 className="mt-4 text-base font-semibold">Nothing matches these filters</h2>
      <p className="mt-1 max-w-sm text-sm text-muted">
        {saved
          ? "Tap the heart on any piece to save it here."
          : "Try a wider price range, another category, or clear the search."}
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-5 h-11 rounded-xl bg-accent px-5 text-sm font-semibold text-on-accent hover:bg-accent-hover"
      >
        Reset filters
      </button>
    </div>
  );
}
