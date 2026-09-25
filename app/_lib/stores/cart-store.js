"use client";

import { createPersistentStore } from "@/app/_lib/stores/create-persistent-store";

// Cart lines are { id, qty }. Prices are always read from the catalogue, never
// stored here, so a stale cart cannot carry an old price.
const EMPTY = [];
const store = createPersistentStore("store.cart.v1", EMPTY);

export const useCart = store.useStore;

export function addToCart(id) {
  store.setState((lines) => {
    const existing = lines.find((line) => line.id === id);
    if (existing) {
      return lines.map((line) => (line.id === id ? { ...line, qty: line.qty + 1 } : line));
    }
    return [...lines, { id, qty: 1 }];
  });
}

export function setCartQty(id, qty) {
  store.setState((lines) =>
    qty < 1 ? lines.filter((line) => line.id !== id) : lines.map((line) => (line.id === id ? { ...line, qty } : line)),
  );
}

export function removeFromCart(id) {
  store.setState((lines) => lines.filter((line) => line.id !== id));
}

export function cartCount(lines) {
  return lines.reduce((sum, line) => sum + line.qty, 0);
}
