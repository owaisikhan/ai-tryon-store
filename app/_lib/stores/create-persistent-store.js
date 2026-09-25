"use client";

import { useSyncExternalStore } from "react";

/*
  A tiny module-level store mirrored to localStorage.

  - The server snapshot is always the initial value, so the server render and
    the first client render agree and there is no hydration mismatch.
  - localStorage is read lazily on the first client snapshot.
  - Other tabs stay in sync through the `storage` event.
  - Writes update memory first; a failed persist (private mode, quota) is
    ignored so the UI never blocks on it.
*/
export function createPersistentStore(key, initialValue) {
  let state = initialValue;
  let hydrated = false;
  const listeners = new Set();

  function readStorage() {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initialValue;
    } catch {
      return initialValue;
    }
  }

  function ensureHydrated() {
    if (hydrated || typeof window === "undefined") return;
    hydrated = true;
    state = readStorage();
  }

  function emit() {
    for (const listener of listeners) listener();
  }

  function subscribe(listener) {
    ensureHydrated();
    listeners.add(listener);

    function onStorage(event) {
      if (event.key !== key) return;
      state = readStorage();
      emit();
    }
    window.addEventListener("storage", onStorage);

    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  }

  function getSnapshot() {
    ensureHydrated();
    return state;
  }

  function getServerSnapshot() {
    return initialValue;
  }

  function setState(updater) {
    ensureHydrated();
    state = typeof updater === "function" ? updater(state) : updater;
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // Storage can be full or blocked; memory still holds the value.
    }
    emit();
  }

  function useStore() {
    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  }

  return { useStore, setState, getSnapshot };
}
