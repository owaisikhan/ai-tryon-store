import clsx from "clsx";

// A labelled switch: the whole row is the control.
export default function ToggleRow({ label, checked, onChange, count }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex h-11 w-full items-center justify-between gap-3 text-sm text-muted hover:text-text"
    >
      <span className="flex items-center gap-2">
        {label}
        {count != null && <span className="text-xs tabular-nums text-subtle">{count}</span>}
      </span>
      <span
        aria-hidden="true"
        className={clsx(
          "relative h-6 w-10 rounded-full transition-colors",
          checked ? "bg-accent" : "bg-surface-3",
        )}
      >
        <span
          className={clsx(
            "absolute top-1 size-4 rounded-full transition-transform",
            checked ? "translate-x-5 bg-on-accent" : "translate-x-1 bg-muted",
          )}
        />
      </span>
    </button>
  );
}
