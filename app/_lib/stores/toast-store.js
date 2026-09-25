"use client";

import { useSyncExternalStore } from "react";

// One toast feed for the whole app, mounted once by <Toaster />.
let toasts = [];
let nextId = 1;
const listeners = new Set();
const EMPTY = [];

function emit() {
  for (const listener of listeners) listener();
}

export function toast(message, { tone = "default", duration = 3200 } = {}) {
  const id = nextId++;
  toasts = [...toasts.slice(-2), { id, message, tone }];
  emit();
  window.setTimeout(() => dismissToast(id), duration);
}

export function dismissToast(id) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useToasts() {
  return useSyncExternalStore(
    subscribe,
    () => toasts,
    () => EMPTY,
  );
}
