// The catalogue is local JSON for v1. Both the storefront (client) and the
// try-on route (server) read it through this module, so a database swap later
// touches one file.
import products from "@/app/_data/products.json";
import models from "@/public/models/models.json";

export const CATEGORIES = [
  { slug: "coats", label: "Coats" },
  { slug: "jackets", label: "Jackets & Blazers" },
  { slug: "shirts", label: "Shirts" },
  { slug: "t-shirts", label: "T-Shirts" },
  { slug: "knitwear", label: "Knitwear" },
  { slug: "hoodies", label: "Hoodies" },
  { slug: "trousers", label: "Trousers & Jeans" },
  { slug: "skirts", label: "Skirts" },
  { slug: "dresses", label: "Dresses" },
];

export const GENDERS = [
  { value: "all", label: "All" },
  { value: "women", label: "Women" },
  { value: "men", label: "Men" },
];

export function getProducts() {
  return products;
}

export function getProduct(id) {
  return products.find((p) => p.id === id) ?? null;
}

export function getModels() {
  return models;
}

export function getModel(id) {
  return models.find((m) => m.id === id) ?? null;
}

export const PRICE_BOUNDS = (() => {
  const prices = products.map((p) => p.price);
  return { min: Math.floor(Math.min(...prices) / 10) * 10, max: Math.ceil(Math.max(...prices) / 10) * 10 };
})();

// A representative image per category, used as the category row icon.
export function categoryThumb(slug) {
  return products.find((p) => p.category === slug)?.image ?? null;
}
