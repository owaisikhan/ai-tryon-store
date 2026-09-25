"use client";

import { useEffect, useMemo, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import EmptyResults from "@/app/_components/shop/EmptyResults";
import FiltersPanel from "@/app/_components/shop/FiltersPanel";
import ProductCard from "@/app/_components/shop/ProductCard";
import SortMenu from "@/app/_components/shop/SortMenu";
import Drawer from "@/app/_components/ui/Drawer";
import { CATEGORIES } from "@/app/_lib/catalog";
import { applyFilters, countActiveFilters, sortProducts } from "@/app/_lib/filters";
import { useFittingRoom } from "@/app/_lib/fitting-room/FittingRoomProvider";
import { pluralize } from "@/app/_lib/format-helpers";
import { useFilters } from "@/app/_lib/use-filters";
import { useWishlist } from "@/app/_lib/stores/wishlist-store";

function headingFor(filters) {
  if (filters.saved) return "Saved";
  if (filters.sale) return "On Sale";
  if (filters.category !== "all") return CATEGORIES.find((c) => c.slug === filters.category)?.label;
  return filters.sort === "newest" ? "New Arrivals" : "Shop";
}

const GENDER_WORD = { women: "women's", men: "men's" };

export default function Storefront({ products }) {
  const { filters, setFilters, resetFilters } = useFilters();
  const wishlist = useWishlist();
  const { preferGender, dismissPreference, activeModel } = useFittingRoom();
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Lift the chosen model's gender to the front only while the shopper has
  // not picked a gender filter themselves.
  const lift = filters.gender === "all" ? preferGender : null;

  const visible = useMemo(
    () => sortProducts(applyFilters(products, filters, { wishlist }), filters.sort, { preferGender: lift }),
    [products, filters, wishlist, lift],
  );

  const counts = useMemo(() => {
    const withoutCategory = applyFilters(products, { ...filters, category: "all" }, { wishlist });
    const categories = { all: withoutCategory.length };
    for (const c of CATEGORIES) categories[c.slug] = withoutCategory.filter((p) => p.category === c.slug).length;
    return {
      categories,
      sale: applyFilters(products, { ...filters, sale: true }, { wishlist }).length,
      saved: applyFilters(products, { ...filters, saved: true }, { wishlist }).length,
    };
  }, [products, filters, wishlist]);

  // The header's Search button asks for the search field: the sidebar's on a
  // wide screen, otherwise the filters drawer's.
  useEffect(() => {
    function focusSearch() {
      if (window.matchMedia("(min-width: 1024px)").matches) {
        const field = document.getElementById("sidebar-search");
        field?.scrollIntoView({ block: "center", behavior: "smooth" });
        field?.focus({ preventScroll: true });
      } else {
        setFiltersOpen(true);
        requestAnimationFrame(() => document.getElementById("drawer-search")?.focus());
      }
    }
    window.addEventListener("store:focus-search", focusSearch);
    return () => window.removeEventListener("store:focus-search", focusSearch);
  }, []);

  const activeCount = countActiveFilters(filters);
  const panelProps = { filters, setFilters, resetFilters, activeCount, counts };

  return (
    <section aria-labelledby="catalogue-heading" className="mx-auto max-w-[1440px] px-4 pb-40 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3 pb-5 pt-8">
        <div className="flex items-baseline gap-3">
          <h1 id="catalogue-heading" className="text-2xl font-bold tracking-tight sm:text-[28px]">
            {headingFor(filters)}
          </h1>
          <p className="text-sm text-subtle" aria-live="polite">
            {pluralize(visible.length, "product")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-border-soft bg-surface px-4 text-sm font-medium lg:hidden"
          >
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            Filters
            {activeCount > 0 && (
              <span className="grid size-5 place-items-center rounded-full bg-accent text-[11px] font-bold text-on-accent">
                {activeCount}
              </span>
            )}
          </button>
          <SortMenu value={filters.sort} onChange={(sort) => setFilters({ sort })} />
        </div>
      </div>

      {lift && (
        <div className="mb-5 flex">
          <p className="inline-flex min-h-9 items-center gap-2 rounded-full border border-border-soft bg-surface py-1 pl-4 pr-1 text-[13px] text-muted">
            <span>
              Showing {GENDER_WORD[lift]} and unisex pieces first for{" "}
              <span className="font-semibold text-text">{activeModel.name}</span>
            </span>
            <button
              type="button"
              onClick={dismissPreference}
              aria-label="Show everything in the usual order"
              className="grid size-8 place-items-center rounded-full text-subtle hover:bg-surface-2 hover:text-text"
            >
              <X className="size-3.5" />
            </button>
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[272px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-[var(--radius-card)] border border-border-soft bg-surface p-5">
            <FiltersPanel idPrefix="sidebar" {...panelProps} />
          </div>
        </aside>

        <div className="min-w-0">
          {visible.length === 0 ? (
            <EmptyResults onReset={resetFilters} saved={filters.saved} />
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
              {visible.map((product, i) => (
                <li key={product.id}>
                  <ProductCard product={product} saved={wishlist.includes(product.id)} priority={i < 4} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <Drawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        side="left"
        title="Filters"
        footer={
          <button
            type="button"
            onClick={() => setFiltersOpen(false)}
            className="h-11 w-full rounded-xl bg-accent text-sm font-semibold text-on-accent hover:bg-accent-hover"
          >
            Show {pluralize(visible.length, "product")}
          </button>
        }
      >
        {filtersOpen && <FiltersPanel idPrefix="drawer" {...panelProps} />}
      </Drawer>
    </section>
  );
}
