"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

// Local text for instant typing; the URL is updated after a short pause.
export default function SearchField({ id, value, onChange }) {
  const [text, setText] = useState(value);
  const [synced, setSynced] = useState(value);
  const timer = useRef(null);

  // Adopt outside changes (Reset, Back) without an effect.
  if (value !== synced) {
    setSynced(value);
    setText(value);
  }

  useEffect(() => () => clearTimeout(timer.current), []);

  function handleChange(next) {
    setText(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setSynced(next);
      onChange(next);
    }, 250);
  }

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden="true" />
      <input
        id={id}
        type="search"
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Search products..."
        aria-label="Search products"
        className="h-11 w-full rounded-xl border border-border-soft bg-surface-2 pl-10 pr-10 text-sm font-medium text-text outline-none transition-colors focus:border-accent/60 [&::-webkit-search-cancel-button]:hidden"
      />
      {text && (
        <button
          type="button"
          onClick={() => handleChange("")}
          aria-label="Clear search"
          className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-subtle hover:text-text"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
