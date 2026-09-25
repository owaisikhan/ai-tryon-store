"use client";

import { RotateCcw } from "lucide-react";
import CategoryFilter from "@/app/_components/shop/CategoryFilter";
import FilterSection from "@/app/_components/shop/FilterSection";
import GenderFilter from "@/app/_components/shop/GenderFilter";
import PriceRangeFilter from "@/app/_components/shop/PriceRangeFilter";
import RatingFilter from "@/app/_components/shop/RatingFilter";
import SearchField from "@/app/_components/shop/SearchField";
import ToggleRow from "@/app/_components/shop/ToggleRow";

export default function FiltersPanel({ idPrefix, filters, setFilters, resetFilters, activeCount, counts }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        {/* In the drawer, the drawer's own header already says "Filters". */}
        <h2 className={idPrefix === "drawer" ? "sr-only" : "text-sm font-semibold text-text"}>Filters</h2>
        <button
          type="button"
          onClick={resetFilters}
          disabled={activeCount === 0}
          className="-mr-2 ml-auto inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-[13px] font-medium text-accent-text transition-opacity hover:underline disabled:opacity-40 disabled:hover:no-underline"
        >
          <RotateCcw className="size-3.5" aria-hidden="true" />
          Reset Filters
        </button>
      </div>

      <SearchField id={`${idPrefix}-search`} value={filters.q} onChange={(q) => setFilters({ q }, { replace: true })} />

      <FilterSection title="Shop for" id={`${idPrefix}-gender`}>
        <GenderFilter value={filters.gender} onChange={(gender) => setFilters({ gender })} />
      </FilterSection>

      <FilterSection title="Category" id={`${idPrefix}-category`}>
        <CategoryFilter value={filters.category} counts={counts.categories} onChange={(category) => setFilters({ category })} />
      </FilterSection>

      <FilterSection title="Price range" id={`${idPrefix}-price`}>
        <PriceRangeFilter
          min={filters.min}
          max={filters.max}
          onChange={(min, max) => setFilters({ min, max }, { replace: true })}
        />
      </FilterSection>

      <FilterSection title="Rating" id={`${idPrefix}-rating`}>
        <RatingFilter value={filters.rating} onChange={(rating) => setFilters({ rating })} />
      </FilterSection>

      <FilterSection title="Show only" id={`${idPrefix}-toggles`}>
        <ToggleRow label="On sale" checked={filters.sale} count={counts.sale} onChange={(sale) => setFilters({ sale })} />
        <ToggleRow label="Saved" checked={filters.saved} count={counts.saved} onChange={(saved) => setFilters({ saved })} />
      </FilterSection>
    </div>
  );
}
