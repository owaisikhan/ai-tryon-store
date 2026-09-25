// Filter and sort state lives in the URL query string, so a filtered view is
// shareable and Back works. These pure functions parse, serialise and apply it.
import { CATEGORIES, PRICE_BOUNDS } from "@/app/_lib/catalog";

export const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "rating", label: "Top rated" },
];

export const RATINGS = [
  { value: 0, label: "Any rating" },
  { value: 4, label: "4 and up" },
  { value: 4.5, label: "4.5 and up" },
];

export const DEFAULT_FILTERS = {
  q: "",
  gender: "all",
  category: "all",
  min: PRICE_BOUNDS.min,
  max: PRICE_BOUNDS.max,
  rating: 0,
  sale: false,
  saved: false,
  sort: "newest",
};

function clampNumber(value, fallback, lo, hi) {
  // Number(null) and Number("") are 0, not NaN, so a missing param must be
  // caught first or it clamps to the lower bound.
  if (value === null || value === "") return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(hi, Math.max(lo, n));
}

export function parseFilters(params) {
  const get = (key) => params.get(key);
  const gender = ["men", "women"].includes(get("gender")) ? get("gender") : "all";
  const category = CATEGORIES.some((c) => c.slug === get("category")) ? get("category") : "all";
  const sort = SORTS.some((s) => s.value === get("sort")) ? get("sort") : DEFAULT_FILTERS.sort;
  const rating = RATINGS.some((r) => String(r.value) === get("rating")) ? Number(get("rating")) : 0;
  let min = clampNumber(get("min"), PRICE_BOUNDS.min, PRICE_BOUNDS.min, PRICE_BOUNDS.max);
  let max = clampNumber(get("max"), PRICE_BOUNDS.max, PRICE_BOUNDS.min, PRICE_BOUNDS.max);
  if (min > max) [min, max] = [max, min];

  return {
    q: (get("q") ?? "").slice(0, 80),
    gender,
    category,
    min,
    max,
    rating,
    sale: get("sale") === "1",
    saved: get("saved") === "1",
    sort,
  };
}

// Only non-default values go in the URL, so the clean URL stays "/".
export function serializeFilters(filters) {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.gender !== "all") params.set("gender", filters.gender);
  if (filters.category !== "all") params.set("category", filters.category);
  if (filters.min !== PRICE_BOUNDS.min) params.set("min", String(filters.min));
  if (filters.max !== PRICE_BOUNDS.max) params.set("max", String(filters.max));
  if (filters.rating) params.set("rating", String(filters.rating));
  if (filters.sale) params.set("sale", "1");
  if (filters.saved) params.set("saved", "1");
  if (filters.sort !== DEFAULT_FILTERS.sort) params.set("sort", filters.sort);
  return params.toString();
}

export function countActiveFilters(filters) {
  let n = 0;
  if (filters.q.trim()) n++;
  if (filters.gender !== "all") n++;
  if (filters.category !== "all") n++;
  if (filters.min !== PRICE_BOUNDS.min || filters.max !== PRICE_BOUNDS.max) n++;
  if (filters.rating) n++;
  if (filters.sale) n++;
  if (filters.saved) n++;
  return n;
}

// Unisex pieces appear under both Men and Women.
export function matchesGender(product, gender) {
  return gender === "all" || product.gender === gender || product.gender === "unisex";
}

export function applyFilters(products, filters, { wishlist = [] } = {}) {
  const q = filters.q.trim().toLowerCase();
  return products.filter((p) => {
    if (!matchesGender(p, filters.gender)) return false;
    if (filters.category !== "all" && p.category !== filters.category) return false;
    if (p.price < filters.min || p.price > filters.max) return false;
    if (filters.rating && p.rating < filters.rating) return false;
    if (filters.sale && !p.compareAt) return false;
    if (filters.saved && !wishlist.includes(p.id)) return false;
    if (q && !`${p.name} ${p.color} ${p.category} ${p.description}`.toLowerCase().includes(q)) return false;
    return true;
  });
}

const COMPARATORS = {
  newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
  "price-asc": (a, b) => a.price - b.price,
  "price-desc": (a, b) => b.price - a.price,
  rating: (a, b) => b.rating - a.rating || b.reviews - a.reviews,
};

// `preferGender` gently lifts pieces for the chosen model's gender (and
// unisex) to the front, keeping the chosen sort within each group.
export function sortProducts(products, sort, { preferGender = null } = {}) {
  const compare = COMPARATORS[sort] ?? COMPARATORS.newest;
  const sorted = [...products].sort(compare);
  if (!preferGender) return sorted;
  const rank = (p) => (p.gender === preferGender || p.gender === "unisex" ? 0 : 1);
  return sorted.sort((a, b) => rank(a) - rank(b));
}
