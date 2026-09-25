"use client";

import { useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { DEFAULT_FILTERS, parseFilters, serializeFilters } from "@/app/_lib/filters";

// The URL is the source of truth. Writes go through the native History API,
// which Next syncs with useSearchParams without a server round trip.
// Discrete choices push a history entry so Back undoes them; typing and
// dragging replace the current one so Back is not flooded.
export function useFilters() {
  const params = useSearchParams();
  const filters = useMemo(() => parseFilters(params), [params]);

  const setFilters = useCallback(
    (patch, { replace = false } = {}) => {
      const next = { ...filters, ...patch };
      const qs = serializeFilters(next);
      const url = qs ? `?${qs}` : window.location.pathname;
      if (replace) window.history.replaceState(null, "", url);
      else window.history.pushState(null, "", url);
    },
    [filters],
  );

  const resetFilters = useCallback(() => {
    window.history.pushState(null, "", window.location.pathname + (filters.sort !== DEFAULT_FILTERS.sort ? `?sort=${filters.sort}` : ""));
  }, [filters.sort]);

  return { filters, setFilters, resetFilters };
}
