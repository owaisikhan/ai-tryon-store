"use client";

import { createPersistentStore } from "@/app/_lib/stores/create-persistent-store";

const EMPTY = [];
const store = createPersistentStore("store.wishlist.v1", EMPTY);

export const useWishlist = store.useStore;

export function toggleWishlist(id) {
  store.setState((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
}
